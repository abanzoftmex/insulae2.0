import type {
  CondominiumStructureCommandResult,
  CondominiumStructureFormSnapshot,
  CondominiumStructureFormTemplate,
  SaveCondominiumStructureInput,
} from "./condominium-structure-form";

export interface CondominiumStructureFormRepository {
  getTemplate(): Promise<CondominiumStructureFormTemplate | null>;
  getById(id: string): Promise<CondominiumStructureFormSnapshot | null>;
  save(input: SaveCondominiumStructureInput): Promise<CondominiumStructureCommandResult>;
  deleteGroup(id: string): Promise<CondominiumStructureCommandResult>;
}
