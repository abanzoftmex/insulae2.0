import type { LandUseListing } from "../domain/land-use-listing";

export interface LandUseColumnVM {
  key: string;
  label: string;
}

export interface LandUseCellVM {
  amount: string;
  applicationModeLabel: string;
}

export interface LandUseRowVM {
  id: string;
  order: string;
  name: string;
  initials: string;
  totalAreas: string;
  totalM2: string;
  canDelete: boolean;
  charges: Record<string, LandUseCellVM>;
}

export interface LandUseListingVM {
  condominiumName: string;
  condominiumSlug: string;
  usesLandUseFormula: boolean;
  totalRows: string;
  columns: LandUseColumnVM[];
  rows: LandUseRowVM[];
}

function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `$${formatted}`;
}

function formatNumber(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function toModeLabel(mode: "ONE_TIME" | "PER_METER"): string {
  return mode === "PER_METER" ? "Por metraje" : "Pago unico";
}

export function toLandUseListingVM(listing: LandUseListing): LandUseListingVM {
  return {
    condominiumName: listing.condominiumName,
    condominiumSlug: listing.condominiumSlug,
    usesLandUseFormula: listing.usesLandUseFormula,
    totalRows: formatNumber(listing.rows.length, 0),
    columns: listing.columns.map((column) => ({
      key: column.key,
      label: column.label,
    })),
    rows: listing.rows.map((row) => ({
      id: row.id,
      order: row.order !== null ? formatNumber(row.order, 0) : "--",
      name: row.name,
      initials: row.initials?.trim() ? row.initials : "--",
      totalAreas: formatNumber(row.totalAreas, 0),
      totalM2: formatNumber(row.totalM2, 2),
      canDelete: row.canDelete,
      charges: Object.fromEntries(
        row.charges.map((cell) => [
          cell.key,
          {
            amount: formatCurrency(cell.amount),
            applicationModeLabel: toModeLabel(cell.applicationMode),
          },
        ]),
      ),
    })),
  };
}
