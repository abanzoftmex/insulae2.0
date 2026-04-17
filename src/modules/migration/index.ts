import { GetLegacyMigrationPlanUseCase } from "./application/get-legacy-migration-plan.use-case";
import { StaticLegacyTableMappingRepository } from "./infrastructure/static-legacy-table-mapping.repository";

const legacyTableMappingRepository = new StaticLegacyTableMappingRepository();

export const getLegacyMigrationPlanUseCase = new GetLegacyMigrationPlanUseCase(
  legacyTableMappingRepository,
);
