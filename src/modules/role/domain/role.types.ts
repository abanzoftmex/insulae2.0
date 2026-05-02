export interface Role {
  id: string;
  condominiumId: string;
  legacyId: number | null;
  name: string;
  description: string | null;
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
