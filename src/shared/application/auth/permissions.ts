/**
 * Permisos del usuario del panel administrativo.
 *
 * Fuente única de verdad: la base de datos (UserRole -> Role -> RolePermission -> ModuleCatalog).
 * La cookie de sesión solo identifica al usuario; nada de lo que contenga otorga permisos.
 *
 * `getUserPermissions()` se memoriza por petición con React `cache`, así el layout,
 * la página y las acciones de una misma petición comparten una sola consulta.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { ADMIN_SESSION_COOKIE, adminSessionIsCurrent, verifyAdminSession, type AdminSession } from "./admin-session";
import type { ModuleName } from "./modules";
export * from "./permission-utils";
import type { PermissionAction, ModulePermissions, UserPermissions } from "./permission-utils";

/**
 * Lee y verifica la cookie de sesión del panel. Devuelve null si no hay sesión válida, si la
 * cuenta se desactivó o si la contraseña cambió desde que se inició la sesión.
 */
export const readAdminSession = cache(async (): Promise<AdminSession | null> => {
  let session: AdminSession | null;
  try {
    const cookieStore = await cookies();
    session = await verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
  if (!session) return null;
  // Un error de la base se propaga (página de error) en vez de contar como "sin sesión": si no,
  // /api/auth/salir borraría la cookie de una sesión válida por un fallo pasajero.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true, passwordHash: true },
  });
  if (!user?.isActive || !(await adminSessionIsCurrent(session, user.passwordHash))) return null;
  return session;
});

/**
 * Calcula los permisos efectivos de un usuario: unión de los permisos de todos sus
 * roles activos. Un usuario inactivo no tiene permisos. `userType = ADMIN` (la cuenta
 * `admin` del sistema) recibe todos los módulos.
 */
export async function getPermissionsForUser(userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isActive: true,
      userType: true,
      condominiumId: true,
      initialRole: true,
      userRoles: {
        where: { role: { isActive: true } },
        select: {
          role: {
            select: {
              id: true,
              permissions: {
                where: { isActive: true, module: { isActive: true } },
                select: {
                  canRead: true,
                  canCreate: true,
                  canUpdate: true,
                  canDelete: true,
                  module: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return {};
  if (user.userType === "ADMIN") return getFullPermissions();

  let roles = user.userRoles.map((ur) => ur.role);

  // Fallback auto-sanación: si el usuario no tiene UserRole pero tiene initialRole. Nombre exacto
  // salvo mayúsculas: con `equals` + `mode: "insensitive"` (ILIKE) un initialRole "%" tomaba
  // cualquier rol, Master incluido.
  const initialRole = user.initialRole?.trim().toLowerCase();
  if (roles.length === 0 && initialRole) {
    const fallbackRole = (
      await prisma.role.findMany({
        where: { condominiumId: user.condominiumId, isActive: true },
        select: {
          id: true,
          name: true,
          permissions: {
            where: { isActive: true, module: { isActive: true } },
            select: {
              canRead: true,
              canCreate: true,
              canUpdate: true,
              canDelete: true,
              module: { select: { name: true } },
            },
          },
        },
      })
    ).find((role) => role.name.trim().toLowerCase() === initialRole);

    if (fallbackRole) {
      roles = [fallbackRole];
      // Persistir el vínculo en la base de datos de forma asíncrona
      prisma.userRole
        .upsert({
          where: { userId_roleId: { userId, roleId: fallbackRole.id } },
          create: { userId, roleId: fallbackRole.id },
          update: {},
        })
        .catch((err) => console.error("[getPermissionsForUser] Error auto-linking role:", err));
    }
  }

  const permissionsMap: UserPermissions = {};
  for (const role of roles) {
    for (const perm of role.permissions) {
      const modName = perm.module.name;
      const current = (permissionsMap[modName] ??= {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      });
      if (perm.canRead) current.canRead = true;
      if (perm.canCreate) current.canCreate = true;
      if (perm.canUpdate) current.canUpdate = true;
      if (perm.canDelete) current.canDelete = true;
    }
  }
  return permissionsMap;
}

/** Permisos del usuario con sesión activa en esta petición (vacío si no hay sesión). */
export const getUserPermissions = cache(async (): Promise<UserPermissions> => {
  try {
    const session = await readAdminSession();
    if (!session) return {};
    return await getPermissionsForUser(session.userId);
  } catch (error) {
    console.error("[getUserPermissions] Error leyendo permisos:", error);
    return {};
  }
});

/**
 * Todos los módulos activos con permisos completos. Se devuelve un objeto real (no un
 * Proxy) porque los Server Components no pueden pasar Proxies a Client Components.
 */
async function getFullPermissions(): Promise<UserPermissions> {
  const allModules = await prisma.moduleCatalog.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  const perms: UserPermissions = {};
  for (const mod of allModules) {
    perms[mod.name] = { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
  }
  return perms;
}
