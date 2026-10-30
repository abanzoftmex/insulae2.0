/**
 * Qué puede hacer el Directorio con las cuentas.
 *
 * Editar el Directorio no debe servir para apoderarse de una cuenta con acceso al panel ni para
 * darse permisos. Cambiar su contraseña o su correo (y luego pedir el restablecimiento),
 * desactivarla, darle un rol que abre el panel o el tipo ADMIN equivale a entrar como
 * administrador. Todo eso exige el permiso de modificar Roles, que ya permite darse cualquier
 * permiso. La cuenta de sistema (`userType` ADMIN) y el tipo ADMIN solo los toca otra cuenta ADMIN.
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import { MODULES } from "./modules";
import { getUserPermissions, hasPermission, readAdminSession } from "./permissions";

export class AccountGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountGuardError";
  }
}

const NEEDS_ROLES =
  "Para cambiar la contraseña, el correo, el tipo, el rol o el estado de una cuenta con acceso al panel se necesita el permiso de modificar Roles.";
const NEEDS_SYSTEM_ADMIN = "Solo la cuenta administradora del sistema puede modificar esa cuenta o dar el tipo ADMIN.";

async function currentActor(): Promise<{ isSystemAdmin: boolean; canManageRoles: boolean }> {
  const session = await readAdminSession();
  if (!session) throw new AccountGuardError("Sesión no válida.");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { userType: true } });
  const isSystemAdmin = user?.userType === "ADMIN";
  return { isSystemAdmin, canManageRoles: isSystemAdmin || hasPermission(await getUserPermissions(), MODULES.ROLES, "canUpdate") };
}

/**
 * ¿Es la cuenta de sistema o tiene (o tendría al reactivarse) acceso al panel? Se calcula por
 * sus roles aunque esté inactiva: si no, bastaba con desactivar a un administrador para que su
 * contraseña y su correo quedaran a merced del Directorio.
 */
async function accountPrivilege(userId: string): Promise<"system" | "panel" | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userType: true,
      condominiumId: true,
      initialRole: true,
      userRoles: {
        where: { role: { isActive: true } },
        select: {
          role: {
            select: {
              permissions: { where: { isActive: true, canRead: true, module: { isActive: true } }, select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!user) return null;
  if (user.userType === "ADMIN") return "system";
  if (user.userRoles.some((link) => link.role.permissions.length > 0)) return "panel";
  // Sin UserRole, getPermissionsForUser toma el rol de initialRole.
  if (user.userRoles.length === 0 && (await roleGrantsPanel(user.condominiumId, user.initialRole))) return "panel";
  return null;
}

/** ¿El rol (por nombre, como lo guarda el Directorio en `initialRole`) da acceso al panel? */
export async function roleGrantsPanel(condominiumId: string, roleName: string | null | undefined): Promise<boolean> {
  const wanted = roleName?.trim().toLowerCase();
  if (!wanted) return false;
  const roles = await prisma.role.findMany({
    where: { condominiumId, isActive: true },
    select: {
      name: true,
      permissions: { where: { isActive: true, canRead: true, module: { isActive: true } }, select: { id: true }, take: 1 },
    },
  });
  return roles.some((role) => role.name.trim().toLowerCase() === wanted && role.permissions.length > 0);
}

/** Lanza AccountGuardError si quien actúa no puede tocar las credenciales o el estado de esta cuenta. */
export async function assertCanManageAccount(targetUserId: string): Promise<void> {
  const privilege = await accountPrivilege(targetUserId);
  if (!privilege) return;
  const actor = await currentActor();
  if (privilege === "system" && !actor.isSystemAdmin) throw new AccountGuardError(NEEDS_SYSTEM_ADMIN);
  if (!actor.canManageRoles) throw new AccountGuardError(NEEDS_ROLES);
}

/** Lanza AccountGuardError si quien actúa no puede otorgar este tipo de usuario o este rol inicial. */
export async function assertCanGrant(input: {
  condominiumId: string;
  userType?: string | null;
  initialRole?: string | null;
}): Promise<void> {
  const grantsAdmin = input.userType === "ADMIN";
  const grantsPanel = await roleGrantsPanel(input.condominiumId, input.initialRole);
  if (!grantsAdmin && !grantsPanel) return;
  const actor = await currentActor();
  if (grantsAdmin && !actor.isSystemAdmin) throw new AccountGuardError(NEEDS_SYSTEM_ADMIN);
  if (grantsPanel && !actor.canManageRoles) throw new AccountGuardError(NEEDS_ROLES);
}
