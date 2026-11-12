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
import { MODULES, type ModuleName } from "./modules";
import { normalizeRoleLabel } from "./condomino-access";
export * from "./permission-utils";
import type { PermissionAction, ModulePermissions, UserPermissions } from "./permission-utils";

const FORBIDDEN_AUTO_SYNC_ROLE_NAMES = new Set([
  "master",
  "solo minisitio",
  "condomino",
  "dominio pleno",
  "dueno legal",
  "dueno moral",
  "arrendatario",
  "ficha de contacto",
  "administrador de subcondominio",
]);

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
 * roles administrativos activos (`legacyIdGral === 0`). Un usuario inactivo no tiene
 * permisos. `userType = ADMIN` (la cuenta `admin` del sistema) recibe todos los módulos.
 */
export async function getPermissionsForUser(userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isActive: true,
      userType: true,
      condominiumId: true,
      initialRole: true,
      _count: {
        select: { userRoles: true },
      },
      userRoles: {
        where: { role: { isActive: true } },
        select: {
          role: {
            select: {
              id: true,
              name: true,
              legacyIdGral: true,
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

  if (user.userType === "ADMIN") {
    return await getFullPermissions();
  }

  // Solo roles administrativos reales (`legacyIdGral === 0`), nunca roles reservados/patrimoniales ni `initialRole`.
  let adminRoles = user.userRoles
    .map((ur) => ur.role)
    .filter((role) => role.legacyIdGral === 0 && normalizeRoleLabel(role.name) !== "solo minisitio");

  // Auto-sanación acotada: únicamente cuando el usuario no tiene ningún vínculo en UserRole
  // y su initialRole apunta a un rol administrativo ordinario explícito (nunca Master ni roles reservados/patrimoniales).
  const initialRoleTrimmed = user.initialRole?.trim() ?? "";
  const normalizedInitialRole = normalizeRoleLabel(initialRoleTrimmed);
  if (
    user._count.userRoles === 0 &&
    initialRoleTrimmed !== "" &&
    !FORBIDDEN_AUTO_SYNC_ROLE_NAMES.has(normalizedInitialRole)
  ) {
    const fallbackRole = await prisma.role.findFirst({
      where: {
        condominiumId: user.condominiumId,
        name: { equals: initialRoleTrimmed, mode: "insensitive" },
        isActive: true,
        legacyIdGral: 0,
        NOT: [
          { name: { equals: "Master", mode: "insensitive" } },
          { name: { equals: "Solo Minisitio", mode: "insensitive" } },
        ],
        permissions: {
          some: {
            isActive: true,
            canRead: true,
            module: { isActive: true },
          },
        },
      },
      select: {
        id: true,
        name: true,
        legacyIdGral: true,
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
    });

    if (fallbackRole) {
      adminRoles = [fallbackRole];
      // Persistir el vínculo administrativo validado en la base de datos de forma asíncrona
      prisma.userRole
        .upsert({
          where: { userId_roleId: { userId, roleId: fallbackRole.id } },
          create: { userId, roleId: fallbackRole.id },
          update: {},
        })
        .catch((err) => console.error("[getPermissionsForUser] Error auto-linking role:", err));
    }
  }

  const isMasterUser = adminRoles.some((role) => normalizeRoleLabel(role.name) === "master");

  const permissionsMap: UserPermissions = {};
  for (const role of adminRoles) {
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

  // Restricción específica de negocio: El rol Master no puede editar convocatorias
  if (isMasterUser && permissionsMap[MODULES.CONVOCATORIAS]) {
    permissionsMap[MODULES.CONVOCATORIAS].canUpdate = false;
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
