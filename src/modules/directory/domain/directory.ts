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

export interface ParticipationRow {
  entityType: string;
  privateAreaName: string;
  percentage: number;
  hasCommerces: boolean;
}

export interface ParticipationBlock {
  title: string;
  totalAreas: number;
  totalPercentage: number;
  rows: ParticipationRow[];
}

export interface LinkedCommerce {
  id: string;
  name: string;
}

export interface DirectoryContactParticipation {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  lastNamePaterno: string | null;
  lastNameMaterno: string | null;
  businessName: string | null;
  commercialName: string | null;
  curp: string | null;
  rfc: string | null;
  address: string | null;
  taxAddress: string | null;
  userType: "INDIVIDUAL" | "LEGAL_ENTITY" | "ADMIN";
  requiresInvoice: boolean | null;
  email: string | null;
  personalEmail: string | null;
  businessEmail: string | null;
  phone: string | null;
  personalPhone: string | null;
  businessPhone: string | null;
  taxStatusPdfUrl: string | null;
  initialRole: string | null;
  roles: string[];
  participationBlocks: ParticipationBlock[];
  linkedCommerces: LinkedCommerce[];
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
