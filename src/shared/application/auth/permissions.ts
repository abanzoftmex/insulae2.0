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
import { ADMIN_SESSION_COOKIE, verifyAdminSession, type AdminSession } from "./admin-session";
import type { ModuleName } from "./modules";

export type PermissionAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";
export type ModulePermissions = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};
export type UserPermissions = Record<string, ModulePermissions>;

/** Lee y verifica la cookie de sesión del panel. Devuelve null si no hay sesión válida. */
export const readAdminSession = cache(async (): Promise<AdminSession | null> => {
  try {
    const cookieStore = await cookies();
    return await verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
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
      userRoles: {
        where: { role: { isActive: true } },
        select: {
          role: {
            select: {
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

  const permissionsMap: UserPermissions = {};
  for (const { role } of user.userRoles) {
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

export function hasPermission(
  permissions: UserPermissions,
  module: ModuleName | readonly ModuleName[],
  action: PermissionAction = "canRead",
): boolean {
  const modules = Array.isArray(module) ? module : [module as ModuleName];
  return modules.some((m) => permissions[m]?.[action] === true);
}

/** ¿Puede entrar al panel? Basta con leer al menos un módulo. */
export function canAccessAdminPanel(permissions: UserPermissions): boolean {
  return Object.values(permissions).some((p) => p.canRead);
}

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
