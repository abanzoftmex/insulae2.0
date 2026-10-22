"use client";

import { createContext, useContext, ReactNode } from "react";
import { 
  hasPermission, 
  type UserPermissions, 
  type ModulePermissions 
} from "@/shared/application/auth/permission-utils";
import type { ModuleName } from "@/shared/application/auth/modules";

const PermissionsContext = createContext<UserPermissions | null>(null);

export function PermissionsProvider({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: UserPermissions;
}) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

/**
 * Hook to access the current user's permissions.
 * Usage:
 * const permissions = usePermissions();
 * if (permissions["Roles"]?.canRead) { ... }
 */
export function usePermissions(): UserPermissions {
  const context = useContext(PermissionsContext);
  if (context === null) {
    return {};
  }
  return context;
}

/**
 * Hook to access module permissions and read-only status in client components.
 */
export function useModulePermissions(
  module: ModuleName | readonly ModuleName[],
): ModulePermissions & { isReadOnly: boolean } {
  const permissions = usePermissions();
  const canRead = hasPermission(permissions, module, "canRead");
  const canCreate = hasPermission(permissions, module, "canCreate");
  const canUpdate = hasPermission(permissions, module, "canUpdate");
  const canDelete = hasPermission(permissions, module, "canDelete");
  const isReadOnly = canRead && !canCreate && !canUpdate && !canDelete;
  return { canRead, canCreate, canUpdate, canDelete, isReadOnly };
}
