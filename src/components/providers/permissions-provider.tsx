"use client";

import { createContext, useContext, ReactNode } from "react";
import type { UserPermissions } from "@/shared/application/auth/permissions";

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
    // Return empty permissions if used outside provider (or proxy in SuperAdmin case could be handled here if we passed it)
    // The provider should always be at the root.
    return {};
  }
  return context;
}
