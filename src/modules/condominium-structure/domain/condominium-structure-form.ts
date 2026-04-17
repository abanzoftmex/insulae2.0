import type { CondominiumStructureType } from "./condominium-structure-listing";

export interface CondominiumStructureConceptSnapshot {
  id: string;
  name: string;
  quantity: number;
  isAlternate: boolean;
}

export interface CondominiumStructureFormSnapshot {
  id: string;
  name: string;
  position: number;
  structureType: CondominiumStructureType;
  concepts: CondominiumStructureConceptSnapshot[];
}

export interface CondominiumStructureFormTemplate {
  suggestedPosition: number;
}

export interface SaveCondominiumStructureConceptInput {
  id?: string;
  name: string;
  quantity?: number | null;
  isAlternate?: boolean;
}

export interface SaveCondominiumStructureInput {
  id?: string;
  name: string;
  position?: number | null;
  structureType?: CondominiumStructureType;
  concepts: SaveCondominiumStructureConceptInput[];
}

export interface CondominiumStructureCommandResult {
  ok: boolean;
  message: string;
  groupId?: string;
}
