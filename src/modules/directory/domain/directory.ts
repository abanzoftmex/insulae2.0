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

export interface DirectoryRoleBadgeItem {
  name: string;
  color: string;
}

export interface DirectoryRoleOption {
  id: string;
  name: string;
  legacyIdGral: number;
  color: string;
}

export interface MinisitioAccessSummary {
  hasAccess: boolean;
  hasExplicitRole: boolean;
  viaAdminRoleNames: string[];
  viaLegacyRoleNames: string[];
  activeAssignmentsCount: number;
  activeRentalsCount: number;
  ways: string[];
}

export interface DirectoryContactRoleUpdate {
  /** Sincroniza únicamente los UserRole administrativos (`legacyIdGral === 0`). */
  adminRoleIds?: string[];
  /** Vincula o desvincula únicamente el rol explícito "Solo Minisitio" (`legacyIdGral === 5`). */
  grantExplicitMinisitio?: boolean;
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
  initialRole: string | null;
  roles: string[];
  adminRoles: string[];
  adminRoleItems: DirectoryRoleBadgeItem[];
  patrimonialRoles: string[];
  patrimonialRoleItems: DirectoryRoleBadgeItem[];
  hasExplicitMinisitioRole: boolean;
  soloMinisitioName: string;
  soloMinisitioColor: string;
  minisitioAccess: MinisitioAccessSummary;
  assignmentRoles: string[];
  assignedAreas: string[];
  assignmentCount: number;
  totalPrivateAreas: number;
  totalCommerces: number;
  indiviso: number;
  children?: NestedUser[];
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
  commerceNames?: string[];
}

export interface ParticipationBlock {
  title: string;
  totalAreas: number;
  totalPercentage: number;
  rows: ParticipationRow[];
}

export interface LinkedCommerceContact {
  id: string;
  name: string;
}

export interface LinkedCommerce {
  id: string;
  commerceId?: string | null;
  name: string;
  businessName?: string | null;
  rfc?: string | null;
  phone?: string | null;
  email?: string | null;
  administrativeContact?: LinkedCommerceContact | null;
  operativeContact?: LinkedCommerceContact | null;
}

export type RentalContactRole = "ADMIN" | "OPERATIVE";

export interface DirectoryContactRental {
  id: string;
  privateAreaId: string;
  privateAreaName: string;
  commerceId: string | null;
  commerceName: string | null;
  tenantName: string | null;
  contactRoles: RentalContactRole[];
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
  businessClass: string | null;
  notes: string | null;
}

export interface NestedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  lastNamePaterno?: string | null;
  lastNameMaterno?: string | null;
  curp?: string | null;
  personalPhone?: string | null;
  personalEmail?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  registrationTypeCode: string | null;
  registrationTypeDesc: string | null;
  idVq: string | null;
  apolfap?: string | null;
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
  adminRoles: Array<{ id: string; name: string; color: string }>;
  patrimonialRoles: string[];
  patrimonialRoleItems: DirectoryRoleBadgeItem[];
  hasExplicitMinisitioRole: boolean;
  soloMinisitioName: string;
  soloMinisitioColor: string;
  minisitioAccess: MinisitioAccessSummary;
  participationBlocks: ParticipationBlock[];
  linkedCommerces: LinkedCommerce[];
  activeRentals: DirectoryContactRental[];
  assignments: DirectoryContactAssignment[];
  condominiumId: string;
  birthDate: string | null;
  gender: string | null;
  apolfap: string | null;
  registrationTypeCode: string | null;
  registrationTypeDesc: string | null;
  idVq: string | null;
  children: NestedUser[];
}

export type DirectoryContactUpdatePayload = Partial<DirectoryContactParticipation> & {
  roleSync?: DirectoryContactRoleUpdate;
};

export interface DirectoryOverview {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  totalUsers: number;
  totalAssignments: number;
  pagination: DirectoryPagination;
  people: DirectoryPerson[];
}
