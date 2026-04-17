import type { PrivateAreaStatus } from "@/shared/domain/private-area-status";

export type PrivateAreaStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export interface PrivateAreaListingFilters {
  query: string;
  useType: string;
  status: PrivateAreaStatusFilter;
  m2Min: number | null;
  m2Max: number | null;
  page: number;
  pageSize: number;
  paginateByTopLevel?: boolean;
}

export interface PrivateAreaFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface PrivateAreaPartyContact {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface PrivateAreaFinancialSplit {
  owner: number;
  commerce: number;
}

export type PrivateAreaFinancialCellKey =
  | "arrears_2017_2024"
  | "advance_2024"
  | "ordinary_2025_annual"
  | "ordinary_2025_monthly"
  | "ordinary_2025_outstanding"
  | "ordinary_2026_annual"
  | "ordinary_2026_monthly"
  | "ordinary_2026_outstanding"
  | "extra_condo_2024_2025"
  | "extra_condo_2024_2025_outstanding"
  | "extra_commerce_2024_2025"
  | "extra_commerce_2024_2025_outstanding"
  | "stc"
  | "stc_outstanding"
  | "sancion"
  | "sancion_outstanding"
  | "comodato"
  | "comodato_outstanding"
  | "total_outstanding"
  | `month_${number}_${number}`;

export interface PrivateAreaListRow {
  id: string;
  sortOrder: number;
  parentPrivateAreaId: string | null;
  parentName: string | null;
  hierarchyRole: "FUSION" | "PARENT" | "CHILD" | "SINGLE";
  name: string;
  code: string | null;
  zone: string;
  useType: string;
  useTypeInitials: string;
  businessStatus: PrivateAreaStatus;
  businessStatusLabel: string;
  isFusionLegacy: boolean;
  isActive: boolean;
  hasRental: boolean;
  m2Updated: number;
  m2Original: number;
  m2Construction: number;
  m2CommonArea: number;
  m2ConstructionChildren: number;
  m2CommonAreaChildren: number;
  indiviso: number;
  vccc: number;
  commonAreaM2: number;
  totalAreaM2: number;
  annualOrdinaryFee: number;
  monthlyOrdinaryFee: number;
  outstandingBalance: number;
  financialCells: Partial<Record<PrivateAreaFinancialCellKey, PrivateAreaFinancialSplit>>;
  ownerInitialHistory: PrivateAreaPartyContact[];
  ownerLegal: PrivateAreaPartyContact[];
  domainCurrent: PrivateAreaPartyContact[];
  domainFull: PrivateAreaPartyContact[];
  tenantUsers: PrivateAreaPartyContact[];
  rentalAdministrativeContacts: PrivateAreaPartyContact[];
  rentalOperationalContacts: PrivateAreaPartyContact[];
  updatedAt: Date;
}

export interface PrivateAreaListingSummary {
  projectTotalApoles: number;
  projectTotalM2: number;
  projectCommonAreasM2: number;
  legacyLots: number;
  legacyLotsM2: number;
  legacyAvailableLots: number;
  legacyBuiltLots: number;
  legacyFractions: number;
  legacyFusionLots: number;
  registeredAreas: number;
  activeAreas: number;
  inactiveAreas: number;
  availableAreas: number;
  builtAreas: number;
  availableRatio: number;
  builtRatio: number;
  areasWithUseType: number;
  areasWithoutUseType: number;
  totalOriginalM2: number;
  totalUpdatedM2: number;
  estimatedAnnualOrdinaryIncome: number;
  estimatedMonthlyOrdinaryIncome: number;
  estimatedOutstandingBalance: number;
}

export interface PrivateAreaListingPagination {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export interface PrivateAreaListing {
  condominiumName: string;
  condominiumSlug: string;
  projectName: string;
  updatedAt: Date;
  filters: PrivateAreaListingFilters;
  facets: {
    useTypes: PrivateAreaFacetOption[];
  };
  summary: PrivateAreaListingSummary;
  pagination: PrivateAreaListingPagination;
  rows: PrivateAreaListRow[];
  caveats: string[];
}
