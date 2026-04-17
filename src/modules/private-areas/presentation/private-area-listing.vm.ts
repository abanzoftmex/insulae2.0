import type {
  PrivateAreaFacetOption,
  PrivateAreaFinancialCellKey,
  PrivateAreaListing,
  PrivateAreaStatusFilter,
} from "../domain/private-area-listing";

export interface PrivateAreaRowVM {
  id: string;
  name: string;
  code: string;
  hierarchyLabel: string;
  parentName: string;
  zone: string;
  useType: string;
  useTypeInitials: string;
  businessStatusLabel: string;
  statusLabel: string;
  statusTone: "active" | "inactive";
  hasRentalLabel: string;
  m2Updated: string;
  m2Original: string;
  m2Construction: string;
  m2CommonArea: string;
  m2ConstructionChildren: string;
  m2CommonAreaChildren: string;
  indiviso: string;
  vccc: string;
  commonAreaM2: string;
  totalAreaM2: string;
  annualOrdinaryFee: string;
  monthlyOrdinaryFee: string;
  outstandingBalance: string;
  financialCells: Partial<Record<PrivateAreaFinancialCellKey, { owner: string; commerce: string }>>;
  ownerInitialHistory: Array<{ name: string; email: string | null; phone: string | null }>;
  ownerLegal: Array<{ name: string; email: string | null; phone: string | null }>;
  domainCurrent: Array<{ name: string; email: string | null; phone: string | null }>;
  domainFull: Array<{ name: string; email: string | null; phone: string | null }>;
  tenantUsers: Array<{ name: string; email: string | null; phone: string | null }>;
  rentalAdministrativeContacts: Array<{ name: string; email: string | null; phone: string | null }>;
  rentalOperationalContacts: Array<{ name: string; email: string | null; phone: string | null }>;
  updatedAtLabel: string;
}

export interface PrivateAreaListingVM {
  condominiumName: string;
  projectName: string;
  updatedAtLabel: string;
  filters: {
    query: string;
    useType: string;
    status: PrivateAreaStatusFilter;
    m2Min: string;
    m2Max: string;
    pageSize: string;
  };
  facets: {
    useTypes: PrivateAreaFacetOption[];
  };
  summary: {
    projectTotalApoles: string;
    projectTotalM2: string;
    projectCommonAreasM2: string;
    legacyLots: string;
    legacyLotsM2: string;
    legacyAvailableLots: string;
    legacyBuiltLots: string;
    legacyFractions: string;
    legacyFusionLots: string;
    registeredAreas: string;
    activeAreas: string;
    inactiveAreas: string;
    availableAreas: string;
    builtAreas: string;
    availableRatio: string;
    builtRatio: string;
    areasWithUseType: string;
    areasWithoutUseType: string;
    totalOriginalM2: string;
    totalUpdatedM2: string;
    estimatedAnnualOrdinaryIncome: string;
    estimatedMonthlyOrdinaryIncome: string;
    estimatedOutstandingBalance: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  rows: PrivateAreaRowVM[];
  caveats: string[];
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toNumericFilterValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "";
  }

  return String(value);
}

function toHierarchyLabel(role: "FUSION" | "PARENT" | "CHILD" | "SINGLE"): string {
  if (role === "FUSION") {
    return "Fusion";
  }

  if (role === "PARENT") {
    return "Padre";
  }

  if (role === "CHILD") {
    return "Hijo";
  }

  return "Individual";
}

function toDisplayName(name: string, role: "FUSION" | "PARENT" | "CHILD" | "SINGLE"): string {
  if (role !== "CHILD") {
    return name;
  }

  if (/^fap\s*:/i.test(name.trim())) {
    return name;
  }

  return `FAP: ${name}`;
}

export function toPrivateAreaListingVM(listing: PrivateAreaListing): PrivateAreaListingVM {
  return {
    condominiumName: listing.condominiumName,
    projectName: listing.projectName,
    updatedAtLabel: formatDate(listing.updatedAt),
    filters: {
      query: listing.filters.query,
      useType: listing.filters.useType,
      status: listing.filters.status,
      m2Min: toNumericFilterValue(listing.filters.m2Min),
      m2Max: toNumericFilterValue(listing.filters.m2Max),
      pageSize: String(listing.filters.pageSize),
    },
    facets: {
      useTypes: listing.facets.useTypes,
    },
    summary: {
      projectTotalApoles: formatNumber(listing.summary.projectTotalApoles, 0),
      projectTotalM2: formatNumber(listing.summary.projectTotalM2, 4),
      projectCommonAreasM2: formatNumber(listing.summary.projectCommonAreasM2, 4),
      legacyLots: formatNumber(listing.summary.legacyLots, 0),
      legacyLotsM2: formatNumber(listing.summary.legacyLotsM2, 4),
      legacyAvailableLots: formatNumber(listing.summary.legacyAvailableLots, 0),
      legacyBuiltLots: formatNumber(listing.summary.legacyBuiltLots, 0),
      legacyFractions: formatNumber(listing.summary.legacyFractions, 0),
      legacyFusionLots: formatNumber(listing.summary.legacyFusionLots, 0),
      registeredAreas: formatNumber(listing.summary.registeredAreas, 0),
      activeAreas: formatNumber(listing.summary.activeAreas, 0),
      inactiveAreas: formatNumber(listing.summary.inactiveAreas, 0),
      availableAreas: formatNumber(listing.summary.availableAreas, 0),
      builtAreas: formatNumber(listing.summary.builtAreas, 0),
      availableRatio: `${formatNumber(listing.summary.availableRatio, 2)}%`,
      builtRatio: `${formatNumber(listing.summary.builtRatio, 2)}%`,
      areasWithUseType: formatNumber(listing.summary.areasWithUseType, 0),
      areasWithoutUseType: formatNumber(listing.summary.areasWithoutUseType, 0),
      totalOriginalM2: formatNumber(listing.summary.totalOriginalM2, 4),
      totalUpdatedM2: formatNumber(listing.summary.totalUpdatedM2, 4),
      estimatedAnnualOrdinaryIncome: formatCurrency(listing.summary.estimatedAnnualOrdinaryIncome),
      estimatedMonthlyOrdinaryIncome: formatCurrency(listing.summary.estimatedMonthlyOrdinaryIncome),
      estimatedOutstandingBalance: formatCurrency(listing.summary.estimatedOutstandingBalance),
    },
    pagination: {
      page: listing.pagination.page,
      pageSize: listing.pagination.pageSize,
      totalRows: listing.pagination.totalRows,
      totalPages: listing.pagination.totalPages,
      hasPrev: listing.pagination.page > 1,
      hasNext: listing.pagination.page < listing.pagination.totalPages,
    },
    rows: listing.rows.map((row) => {
      const isFapRow = row.hierarchyRole === "CHILD";

      return {
      id: row.id,
      name: toDisplayName(row.name, row.hierarchyRole),
      code: row.code ?? "-",
      hierarchyLabel: toHierarchyLabel(row.hierarchyRole),
      parentName: row.parentName ?? "-",
      zone: row.zone,
      useType: row.useType,
      useTypeInitials: row.useTypeInitials,
      businessStatusLabel: row.businessStatusLabel,
      statusLabel: row.isActive ? "Activo" : "Inactivo",
      statusTone: row.isActive ? "active" : "inactive",
      hasRentalLabel: row.hasRental ? "Si" : "No",
      m2Updated: isFapRow ? "" : formatNumber(row.m2Updated, 4),
      m2Original: isFapRow ? "" : formatNumber(row.m2Original, 4),
      m2Construction: formatNumber(row.m2Construction, 4),
      m2CommonArea: isFapRow ? "" : formatNumber(row.m2CommonArea, 4),
      m2ConstructionChildren: formatNumber(row.m2ConstructionChildren, 4),
      m2CommonAreaChildren: formatNumber(row.m2CommonAreaChildren, 4),
      indiviso: isFapRow ? "" : `${formatNumber(row.indiviso, 4)}%`,
      vccc: formatNumber(row.vccc, 6),
      commonAreaM2: isFapRow ? "" : formatNumber(row.commonAreaM2, 4),
      totalAreaM2: isFapRow ? "" : formatNumber(row.totalAreaM2, 4),
      annualOrdinaryFee: formatCurrency(row.annualOrdinaryFee),
      monthlyOrdinaryFee: formatCurrency(row.monthlyOrdinaryFee),
      outstandingBalance: formatCurrency(row.outstandingBalance),
      financialCells: Object.fromEntries(
        Object.entries(row.financialCells).map(([key, value]) => [
          key,
          {
            owner: formatCurrency(value?.owner ?? 0),
            commerce: formatCurrency(value?.commerce ?? 0),
          },
        ]),
      ),
      ownerInitialHistory: row.ownerInitialHistory,
      ownerLegal: row.ownerLegal,
      domainCurrent: row.domainCurrent,
      domainFull: row.domainFull,
      tenantUsers: row.tenantUsers,
      rentalAdministrativeContacts: row.rentalAdministrativeContacts,
      rentalOperationalContacts: row.rentalOperationalContacts,
      updatedAtLabel: formatDate(row.updatedAt),
    };
    }),
    caveats: listing.caveats,
  };
}
