import type {
  CondominiumStructureGroupListItem,
  CondominiumStructureListing,
  CondominiumStructureType,
} from "../domain/condominium-structure-listing";

export interface CondominiumStructureListingRowVm {
  id: string;
  name: string;
  positionLabel: string;
  typeLabel: string;
  conceptsLabel: string;
  conceptsCountLabel: string;
  canDelete: boolean;
}

export interface CondominiumStructureListingVm {
  title: string;
  subtitle: string;
  rows: CondominiumStructureListingRowVm[];
}

function toTypeLabel(value: CondominiumStructureType): string {
  if (value === 1) {
    return "Consejo";
  }

  if (value === 2) {
    return "Comision";
  }

  if (value === 3) {
    return "Comite";
  }

  return "N/A";
}

function toRowVm(row: CondominiumStructureGroupListItem): CondominiumStructureListingRowVm {
  return {
    id: row.id,
    name: row.name,
    positionLabel: String(row.position),
    typeLabel: toTypeLabel(row.structureType),
    conceptsLabel: row.conceptsLabel || "Sin conceptos",
    conceptsCountLabel: `${row.totalConcepts} ${row.totalConcepts === 1 ? "concepto" : "conceptos"}`,
    canDelete: row.canDelete,
  };
}

export function toCondominiumStructureListingVm(
  listing: CondominiumStructureListing,
): CondominiumStructureListingVm {
  return {
    title: "Estructura condominal",
    subtitle: `Gestion operativa de grupos y conceptos para ${listing.condominiumName}.`,
    rows: listing.rows.map(toRowVm),
  };
}
