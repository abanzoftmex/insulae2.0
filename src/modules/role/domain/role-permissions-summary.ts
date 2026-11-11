import type { ModuleCatalog, RolePermission } from "./role.types";

export interface RolePermissionsSummary {
  totalModules: number;
  maxPermissions: number;
  modulesWithAccess: number;
  totalGranted: number;
  readCount: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
}

export interface PermissionMatrixInput {
  moduleId: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isActive?: boolean;
}

/**
 * Calcula el resumen real de permisos de un rol considerando las 4 acciones
 * (Leer, Crear, Editar, Eliminar) por cada módulo activo del catálogo.
 */
export function summarizeRolePermissions(
  permissions: readonly PermissionMatrixInput[] | undefined,
  catalogModules: readonly ModuleCatalog[],
  roleIsActive: boolean = true
): RolePermissionsSummary {
  const activeModules = catalogModules.filter((m) => m.isActive);
  const activeModuleIds = new Set(activeModules.map((m) => m.id));
  const totalModules = activeModules.length;
  const maxPermissions = totalModules * 4;

  if (!roleIsActive || !permissions || permissions.length === 0) {
    return {
      totalModules,
      maxPermissions,
      modulesWithAccess: 0,
      totalGranted: 0,
      readCount: 0,
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
    };
  }

  let modulesWithAccess = 0;
  let readCount = 0;
  let createCount = 0;
  let updateCount = 0;
  let deleteCount = 0;

  for (const perm of permissions) {
    if (perm.isActive === false) continue;
    if (activeModuleIds.size > 0 && !activeModuleIds.has(perm.moduleId)) continue;

    const r = Boolean(perm.canRead);
    const c = Boolean(perm.canCreate);
    const u = Boolean(perm.canUpdate);
    const d = Boolean(perm.canDelete);

    if (r) readCount++;
    if (c) createCount++;
    if (u) updateCount++;
    if (d) deleteCount++;
    if (r || c || u || d) modulesWithAccess++;
  }

  return {
    totalModules,
    maxPermissions,
    modulesWithAccess,
    totalGranted: readCount + createCount + updateCount + deleteCount,
    readCount,
    createCount,
    updateCount,
    deleteCount,
  };
}

export function indexPermissionsByModuleId(
  permissions: readonly RolePermission[] | undefined
): Map<string, RolePermission> {
  const map = new Map<string, RolePermission>();
  if (!permissions) return map;
  for (const perm of permissions) {
    if (perm.isActive) {
      map.set(perm.moduleId, perm);
    }
  }
  return map;
}

