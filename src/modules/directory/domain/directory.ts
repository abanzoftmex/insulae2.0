export interface DirectoryFilters {
  query: string;
  page: number;
  pageSize: number;
}

export interface DirectoryPagination {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface DirectoryPerson {
  id: string;
  displayName: string;
  commerceName: string | null;
  legalName: string;
  userType: "INDIVIDUAL" | "LEGAL_ENTITY" | "ADMIN";
  requiresInvoice: boolean | null;
  email: string | null;
  phone: string | null;
  roles: string[];
  assignmentRoles: string[];
  assignedAreas: string[];
  assignmentCount: number;
}

export interface DirectoryContactAssignment {
  privateAreaId: string;
  privateAreaName: string;
  roleName: string;
}

export interface DirectoryContactParticipation {
  id: string;
  displayName: string;
  userType: "INDIVIDUAL" | "LEGAL_ENTITY" | "ADMIN";
  requiresInvoice: boolean | null;
  email: string | null;
  phone: string | null;
  roles: string[];
  assignments: DirectoryContactAssignment[];
}

export interface DirectoryOverview {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  totalUsers: number;
  totalAssignments: number;
  pagination: DirectoryPagination;
  people: DirectoryPerson[];
}
