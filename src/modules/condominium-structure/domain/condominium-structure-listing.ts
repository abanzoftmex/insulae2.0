export type CondominiumStructureType = 0 | 1 | 2 | 3;

export interface CondominiumStructurePositionListItem {
  id: string;
  name: string;
  quantity: number;
  isAlternate: boolean;
}

export interface CondominiumStructureGroupListItem {
  id: string;
  name: string;
  position: number;
  structureType: CondominiumStructureType;
  conceptsLabel: string;
  totalConcepts: number;
  canDelete: boolean;
  concepts: CondominiumStructurePositionListItem[];
}

export interface CondominiumStructureListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  rows: CondominiumStructureGroupListItem[];
}
