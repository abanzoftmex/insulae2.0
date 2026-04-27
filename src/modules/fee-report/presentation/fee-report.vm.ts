// ─────────────────────────────────────────────────────────────────────────────
// FEE REPORT VIEW MODEL
// Transforma el dominio en datos listos para renderizar en la UI.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  FeeReportListing,
  FeeReportRow,
  FeeReportTotals,
} from "../domain/fee-report";

// ─── formatters ─────────────────────────────────────────────────────────────

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMXN(value: number): string {
  return MXN.format(value);
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES_ES[month - 1]} ${year}`;
}

// ─── column header definitions ───────────────────────────────────────────────

export interface FeeReportColumnHeader {
  key: string;
  label: string;
  subLabel?: string;
  group: "historic" | "yearN" | "yearN1" | "balance" | "monthsN" | "monthsN1";
}

export function buildColumnHeaders(
  primaryYear: number,
  secondaryYear: number,
  previousYear: number
): FeeReportColumnHeader[] {
  const headers: FeeReportColumnHeader[] = [
    {
      key: "pastDue",
      label: `Cartera vencida 2017–${previousYear}`,
      group: "historic",
    },
    {
      key: "prepaid",
      label: `Pago Anticipado ${previousYear}`,
      group: "historic",
    },
    {
      key: `annual_${primaryYear}`,
      label: `Cuotas ordinarias ${primaryYear}`,
      subLabel: "(anual)",
      group: "yearN",
    },
    {
      key: `monthly_${primaryYear}`,
      label: `Cuotas ordinarias ${primaryYear}`,
      subLabel: "(mensual)",
      group: "yearN",
    },
    {
      key: `balance_${primaryYear}`,
      label: `Cuotas ordinarias ${primaryYear}`,
      subLabel: "(saldo actual)",
      group: "yearN",
    },
    {
      key: `annual_${secondaryYear}`,
      label: `Cuotas ordinarias ${secondaryYear}`,
      subLabel: "(anual)",
      group: "yearN1",
    },
    {
      key: `monthly_${secondaryYear}`,
      label: `Cuotas ordinarias ${secondaryYear}`,
      subLabel: "(mensual)",
      group: "yearN1",
    },
    {
      key: `balance_${secondaryYear}`,
      label: `Cuotas ordinarias ${secondaryYear}`,
      subLabel: "(saldo actual)",
      group: "yearN1",
    },
    {
      key: "totalBalance",
      label: "Saldo actual",
      group: "balance",
    },
    // 12 meses primaryYear
    ...Array.from({ length: 12 }, (_, i) => ({
      key: `m_${primaryYear}_${i + 1}`,
      label: monthLabel(i + 1, primaryYear),
      group: "monthsN" as const,
    })),
    // 12 meses secondaryYear
    ...Array.from({ length: 12 }, (_, i) => ({
      key: `m_${secondaryYear}_${i + 1}`,
      label: monthLabel(i + 1, secondaryYear),
      group: "monthsN1" as const,
    })),
  ];

  return headers;
}

// ─── row VM ──────────────────────────────────────────────────────────────────

export interface FeeReportCellVM {
  ownerLabel: string;
  commerceLabel: string;
  hasCommerce: boolean;
}

export interface FeeReportRowVM {
  id: string;
  areaLabel: string;       // "AP: VQ01A" o "FAP: VQ01A-010"
  statusLabel: string;
  statusCss: string;
  isChild: boolean;        // true si es FAP (tiene parentId)
  pastDue: FeeReportCellVM;
  prepaid: FeeReportCellVM;
  yearCells: {
    year: number;
    annual: FeeReportCellVM;
    monthly: FeeReportCellVM;
    balance: FeeReportCellVM;
  }[];
  totalBalance: FeeReportCellVM;
  monthlyCells: FeeReportCellVM[]; // 24 celdas: 12 primaryYear + 12 secondaryYear
}

function toCell(
  owner: number,
  commerce: number,
  hasCommerce: boolean
): FeeReportCellVM {
  return {
    // Si no desglosa comercio (es AP), el "Propietario" asume la suma total de ambos rubros
    ownerLabel: formatMXN(hasCommerce ? owner : owner + commerce),
    commerceLabel: formatMXN(hasCommerce ? commerce : 0),
    hasCommerce,
  };
}

function rowToVM(row: FeeReportRow): FeeReportRowVM {
  const prefix = row.parentId ? "FAP" : "AP";
  const areaLabel = `${prefix}: ${row.name}`;
  // User Requirement: "cuando es AP: solo muestra propietario y cuando es FAP: muestra propietario y comercio"
  const hasCommerce = !!row.parentId;

  const yearCells = row.yearCharges.map((yc) => ({
    year: yc.year,
    // annual/mensual: cuota base separada por responsabilidad
    annual:  toCell(yc.ownerAnnualAmount,    yc.commerceAnnualAmount,    hasCommerce),
    monthly: toCell(yc.ownerMonthlyAmount,   yc.commerceMonthlyAmount,   hasCommerce),
    // balance: saldo pendiente separado por responsabilidad
    balance: toCell(yc.ownerBalance,         yc.commerceBalance,         hasCommerce),
  }));

  const monthlyCells = row.monthlyPayments.map((mc) =>
    toCell(mc.ownerAmount, mc.commerceAmount, hasCommerce)
  );

  // Saldo global calculado en el repositorio con la fórmula correcta:
  // carteraVencida + primaryYear_balance + elapsed_months_of_secondaryYear
  return {
    id: row.id,
    areaLabel,
    statusLabel: row.status,
    statusCss: row.statusCss,
    isChild: row.parentId !== null,
    pastDue:      toCell(row.pastDueOwner,           row.pastDueCommerce,          hasCommerce),
    prepaid:      toCell(row.prepaidPrevYearOwner,   row.prepaidPrevYearCommerce,  hasCommerce),
    yearCells,
    totalBalance: toCell(row.totalOwnerBalance,      row.totalCommerceBalance,     hasCommerce),
    monthlyCells,
  };
}

function totalsToVM(totals: FeeReportTotals): FeeReportRowVM {
  // Los totales globales siempre desglosan ambos para tener la visibilidad de toda la suma
  const hasCommerce = true;

  const yearCells = totals.yearCharges.map((yc) => ({
    year: yc.year,
    annual:  toCell(yc.ownerAnnualAmount,  yc.commerceAnnualAmount,  hasCommerce),
    monthly: toCell(yc.ownerMonthlyAmount, yc.commerceMonthlyAmount, hasCommerce),
    balance: toCell(yc.ownerBalance,       yc.commerceBalance,       hasCommerce),
  }));

  const monthlyCells = totals.monthlyCells.map((mc) =>
    toCell(mc.ownerAmount, mc.commerceAmount, mc.commerceAmount > 0)
  );

  return {
    id: "__totals__",
    areaLabel: "TOTALES",
    statusLabel: "",
    statusCss: "",
    isChild: false,
    pastDue:      toCell(totals.pastDueOwner,          totals.pastDueCommerce,          hasCommerce),
    prepaid:      toCell(totals.prepaidPrevYearOwner,  totals.prepaidPrevYearCommerce,  hasCommerce),
    yearCells,
    totalBalance: toCell(totals.totalCurrentBalance,   0,                               false),
    monthlyCells,
  };
}

// ─── listing VM ──────────────────────────────────────────────────────────────

export interface FeeReportListingVM {
  title: string;
  subtitle: string;
  primaryYear: number;
  secondaryYear: number;
  previousYear: number;
  lastUpdatedLabel: string;
  totalAreas: number;
  columns: FeeReportColumnHeader[];
  rows: FeeReportRowVM[];
  totalsRow: FeeReportRowVM;
  /** Paginación */
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toFeeReportListingVM(listing: FeeReportListing): FeeReportListingVM {
  const { primaryYear, secondaryYear, previousYear } = listing;

  const lastUpdatedLabel = listing.lastUpdatedAt
    ? new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(listing.lastUpdatedAt)
    : "No disponible";

  return {
    title: "Reporte de cuotas ordinarias",
    subtitle: `Listado de áreas privativas con estado de cuotas ${primaryYear}–${secondaryYear}.`,
    primaryYear,
    secondaryYear,
    previousYear,
    lastUpdatedLabel,
    totalAreas: listing.totalAreas,
    columns: buildColumnHeaders(primaryYear, secondaryYear, previousYear),
    rows: listing.rows.map(rowToVM),
    totalsRow: totalsToVM(listing.totals),
    page: listing.page,
    pageSize: listing.pageSize,
    totalPages: listing.totalPages,
  };
}

// ─── EXTRAORDINARY VM ─────────────────────────────────────────────────────────

export interface FeeReportExtraordinaryRowVM {
  id: string;
  areaLabel: string;
  statusLabel: string;
  statusCss: string;
  isChild: boolean;
  baseFee: FeeReportCellVM;
  totalBalance: FeeReportCellVM;
  monthlyCells: FeeReportCellVM[]; // 12 primaryYear + 12 secondaryYear
}

export interface FeeReportExtraordinaryListingVM {
  title: string;
  subtitle: string;
  primaryYear: number;
  secondaryYear: number;
  previousYear: number;
  lastUpdatedLabel: string;
  totalAreas: number;
  columns: FeeReportColumnHeader[]; // Reuse same column header struct
  rows: FeeReportExtraordinaryRowVM[];
  totalsRow: FeeReportExtraordinaryRowVM;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildExtraordinaryColumnHeaders(
  primaryYear: number,
  secondaryYear: number,
  previousYear: number
): FeeReportColumnHeader[] {
  return [
    {
      key: "baseFee",
      label: `Cuotas extraordinarias ${previousYear} - ${primaryYear}`,
      group: "base" as any,
    },
    {
      key: "totalBalance",
      label: "Saldo actual",
      group: "balance",
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      key: `m_${primaryYear}_${i + 1}`,
      label: monthLabel(i + 1, primaryYear),
      group: "monthsN" as const,
    })),
    ...Array.from({ length: 12 }, (_, i) => ({
      key: `m_${secondaryYear}_${i + 1}`,
      label: monthLabel(i + 1, secondaryYear),
      group: "monthsN1" as const,
    })),
  ];
}

function rowToExtraordinaryVM(row: FeeReportRow): FeeReportExtraordinaryRowVM {
  const prefix = row.parentId ? "FAP" : "AP";
  const areaLabel = `${prefix}: ${row.name}`;
  
  // User Requirement: "cuando es AP: solo muestra propietario y cuando es FAP: muestra propietario y comercio"
  const hasCommerce = !!row.parentId;

  // Take the primaryYear monthly amount as the "base fee"
  const primaryYc = row.yearCharges[0]; // yearCharges[0] is primaryYear
  
  return {
    id: row.id,
    areaLabel: areaLabel,
    statusLabel: row.status,
    statusCss: row.statusCss,
    isChild: !!row.parentId,
    baseFee: toCell(
      primaryYc?.ownerMonthlyAmount ?? 0,
      primaryYc?.commerceMonthlyAmount ?? 0,
      hasCommerce
    ),
    totalBalance: toCell(
      row.totalOwnerBalance,
      row.totalCommerceBalance,
      hasCommerce
    ),
    monthlyCells: row.monthlyPayments.map((mc) =>
      toCell(mc.ownerAmount, mc.commerceAmount, hasCommerce)
    ),
  };
}

function totalsToExtraordinaryVM(totals: FeeReportTotals): FeeReportExtraordinaryRowVM {
  // Los totales globales siempre desglosan ambos para tener la visibilidad de toda la suma
  const hasCommerce = true;

  const primaryYc = totals.yearCharges[0];

  return {
    id: "totals-row",
    areaLabel: "Total general",
    statusLabel: "",
    statusCss: "",
    isChild: false,
    baseFee: toCell(
      primaryYc?.ownerMonthlyAmount ?? 0,
      primaryYc?.commerceMonthlyAmount ?? 0,
      hasCommerce
    ),
    totalBalance: toCell(
      totals.totalCurrentBalance,
      0,
      hasCommerce
    ),
    monthlyCells: totals.monthlyCells.map((mc) =>
      toCell(mc.ownerAmount, mc.commerceAmount, hasCommerce)
    ),
  };
}

export function toExtraordinaryFeeReportListingVM(listing: FeeReportListing): FeeReportExtraordinaryListingVM {
  const { primaryYear, secondaryYear, previousYear } = listing;

  const lastUpdatedLabel = listing.lastUpdatedAt
    ? new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(listing.lastUpdatedAt)
    : "No disponible";

  return {
    title: "Reporte de cuotas extraordinarias",
    subtitle: `Listado de áreas privativas con estado de cuotas extraordinarias ${previousYear}–${primaryYear}.`,
    primaryYear,
    secondaryYear,
    previousYear,
    lastUpdatedLabel,
    totalAreas: listing.totalAreas,
    columns: buildExtraordinaryColumnHeaders(primaryYear, secondaryYear, previousYear),
    rows: listing.rows.map(rowToExtraordinaryVM),
    totalsRow: totalsToExtraordinaryVM(listing.totals),
    page: listing.page,
    pageSize: listing.pageSize,
    totalPages: listing.totalPages,
  };
}
