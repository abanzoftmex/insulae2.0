import type { UseCase } from "@/shared/application/use-case";
import type { LegacyTableMapping } from "../domain/legacy-table-mapping";
import type { LegacyTableMappingRepository } from "../domain/legacy-table-mapping.repository";

export interface LegacyMigrationPlan {
  toMigrate: LegacyTableMapping[];
  toDeleteOrReplace: LegacyTableMapping[];
}

export class GetLegacyMigrationPlanUseCase
  implements UseCase<void, LegacyMigrationPlan>
{
  constructor(private readonly repository: LegacyTableMappingRepository) {}

  async execute(): Promise<LegacyMigrationPlan> {
    const mappings = await this.repository.getAll();

    return {
      toMigrate: mappings.filter((item) => item.action === "migrar"),
      toDeleteOrReplace: mappings.filter((item) => item.action !== "migrar"),
    };
  }
}
