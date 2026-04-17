import type { LegacyTableMapping } from "../domain/legacy-table-mapping";

export interface MigrationPlanVM {
  total: number;
  toMigrate: number;
  toDeleteOrReplace: number;
  pendingRetire: LegacyTableMapping[];
}

export function toMigrationPlanVM(input: {
  toMigrate: LegacyTableMapping[];
  toDeleteOrReplace: LegacyTableMapping[];
}): MigrationPlanVM {
  return {
    total: input.toMigrate.length + input.toDeleteOrReplace.length,
    toMigrate: input.toMigrate.length,
    toDeleteOrReplace: input.toDeleteOrReplace.length,
    pendingRetire: input.toDeleteOrReplace,
  };
}
