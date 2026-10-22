import type { ModuleName } from "./modules";

export type PermissionAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";
export type ModulePermissions = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};
export type UserPermissions = Record<string, ModulePermissions>;

export function hasPermission(
  permissions: UserPermissions,
  module: ModuleName | readonly ModuleName[],
  action: PermissionAction = "canRead",
): boolean {
  const modules = Array.isArray(module) ? module : [module as ModuleName];
  return modules.some((m) => permissions[m]?.[action] === true);
}

export function getModulePermissions(
  permissions: UserPermissions,
  module: ModuleName | readonly ModuleName[],
): ModulePermissions & { isReadOnly: boolean } {
  const canRead = hasPermission(permissions, module, "canRead");
  const canCreate = hasPermission(permissions, module, "canCreate");
  const canUpdate = hasPermission(permissions, module, "canUpdate");
  const canDelete = hasPermission(permissions, module, "canDelete");
  const isReadOnly = canRead && !canCreate && !canUpdate && !canDelete;
  return { canRead, canCreate, canUpdate, canDelete, isReadOnly };
}

/** ¿Puede entrar al panel? Basta con leer al menos un módulo. */
export function canAccessAdminPanel(permissions: UserPermissions): boolean {
  return Object.values(permissions).some((p) => p.canRead);
}
