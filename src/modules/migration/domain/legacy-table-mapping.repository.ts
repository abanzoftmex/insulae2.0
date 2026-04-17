import type { LegacyTableMapping } from "./legacy-table-mapping";

export interface LegacyTableMappingRepository {
  getAll(): Promise<LegacyTableMapping[]>;
}
