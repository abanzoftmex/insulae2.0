import { prisma } from "@/shared/infrastructure/db/prisma";
import { cookies } from "next/headers";

export type PermissionAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";
export type ModulePermissions = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};
export type UserPermissions = Record<string, ModulePermissions>;

/**
 * Retrieves the permissions for the currently logged-in user from the database.
 * This should be used in Server Components or Server Actions.
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  try {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get("insulae_session")?.value;
    
    if (!sessionStr) return {};

    const session = JSON.parse(sessionStr);
    const userId = session.userId;
    const roleType = session.role;
    const email = session.email;

    if (!userId) return {};

    if (roleType === "ADMIN" || roleType === "SuperAdmin" || roleType === "Administrador") {
      return await getFullSuperAdminPermissions();
    }
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              where: { isActive: true },
              include: { module: true },
            },
          },
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { initialRole: true },
    });

    let additionalRole = null;
    if (user?.initialRole) {
      additionalRole = await prisma.role.findFirst({
        where: { name: user.initialRole, isActive: true },
        include: {
          permissions: {
            where: { isActive: true },
            include: { module: true },
          },
        },
      });
    }

    const permissionsMap: UserPermissions = {};

    const allRolesToProcess = userRoles.map((ur) => ur.role);
    if (additionalRole && !allRolesToProcess.some((r) => r.id === additionalRole.id)) {
      allRolesToProcess.push(additionalRole);
    }

    for (const role of allRolesToProcess) {
      if (!role.isActive) continue;
      
      for (const perm of role.permissions) {
        const modName = perm.module.name;
        if (!permissionsMap[modName]) {
          permissionsMap[modName] = {
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          };
        }
        
        if (perm.canRead) permissionsMap[modName].canRead = true;
        if (perm.canCreate) permissionsMap[modName].canCreate = true;
        if (perm.canUpdate) permissionsMap[modName].canUpdate = true;
        if (perm.canDelete) permissionsMap[modName].canDelete = true;
      }
    }



    return permissionsMap;
  } catch (error) {
    console.error("[getUserPermissions] Error reading permissions:", error);
    return {};
  }
}

/**
 * Fetches all modules and returns full permissions for SuperAdmin users.
 * We must return a real object (not a Proxy) because Server Components 
 * cannot pass Proxies to Client Components.
 */
async function getFullSuperAdminPermissions(): Promise<UserPermissions> {
  const allModules = await prisma.moduleCatalog.findMany({
    select: { name: true }
  });
  
  const perms: UserPermissions = {};
  for (const mod of allModules) {
    perms[mod.name] = {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }
  return perms;
}
