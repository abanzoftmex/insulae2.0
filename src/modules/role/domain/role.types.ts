export interface Role {
  id: string;
  condominiumId: string;
  legacyId: number | null;
  legacyIdGral?: number;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: RolePermission[];
}

export interface ModuleCatalog {
  id: string;
  legacyId: number | null;
  name: string;
  isActive: boolean;
}

export interface RolePermission {
  id: string;
  roleId: string;
  moduleId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canRead: boolean;
  canDelete: boolean;
  isActive: boolean;
  module?: ModuleCatalog;
}

export interface CreateRoleRequest {
  condominiumId: string;
  name: string;
  description?: string;
  color?: string | null;
  permissions: {
    moduleId: string;
    canCreate: boolean;
    canUpdate: boolean;
    canRead: boolean;
    canDelete: boolean;
  }[];
}

export interface UpdateRoleRequest extends CreateRoleRequest {
  id: string;
}

export interface UpdateRoleColorRequest {
  id: string;
  condominiumId: string;
  color: string;
}

export interface AffectedRoleUser {
  id: string;
  fullName: string;
  email: string | null;
  userType: string;
  willBeDeactivated: boolean;
  otherActiveRoles: string[];
  retentionReason: string | null;
}

export interface RoleDeactivationImpact {
  role: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    activePermissionsCount: number;
  };
  canDeactivate: boolean;
  blockReason: string | null;
  assignedUsers: AffectedRoleUser[];
  usersToDeactivateCount: number;
  usersRetainedCount: number;
  isAdminRole: boolean;
  remainingActiveAdminsCount: number;
}

export interface DeactivateRoleResult {
  roleId: string;
  roleName: string;
  disabledPermissionsCount: number;
  deactivatedUsersCount: number;
  retainedUsersCount: number;
  deactivatedUsers: Array<{ id: string; fullName: string; email: string | null }>;
  retainedUsers: Array<{
    id: string;
    fullName: string;
    email: string | null;
    otherActiveRoles: string[];
  }>;
}
