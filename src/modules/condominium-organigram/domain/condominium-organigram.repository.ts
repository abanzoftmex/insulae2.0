import type {
  CondominiumOrganigramCommandResult,
  CondominiumOrganigramSnapshot,
  SaveCondominiumOrganigramInput,
} from "./condominium-organigram";

export interface CondominiumOrganigramRepository {
  getSnapshot(): Promise<CondominiumOrganigramSnapshot | null>;
  save(input: SaveCondominiumOrganigramInput): Promise<CondominiumOrganigramCommandResult>;
}
