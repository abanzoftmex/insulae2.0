import { MIGRATION_LAYERS, getIncludedTablesWithoutLayer } from "@/config/migration-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { LoadLayerToStagingUseCase } from "./load-layer-to-staging.use-case";
import { PromoteFromStagingUseCase } from "./promote-from-staging.use-case";
import { ValidateLayerUseCase } from "./validate-layer.use-case";
import type { LegacySource } from "../domain/legacy-source";

export interface RunFullMigrationInput {
  runName: string;
  sourceSnapshot: string;
  dryRun: boolean;
  source: LegacySource;
  batchSize: number;
}

export class RunFullMigrationUseCase {
  private readonly loadLayerToStagingUseCase = new LoadLayerToStagingUseCase();
  private readonly promoteFromStagingUseCase = new PromoteFromStagingUseCase();
  private readonly validateLayerUseCase = new ValidateLayerUseCase();

  async execute(input: RunFullMigrationInput): Promise<string> {
    const unlayeredTables = getIncludedTablesWithoutLayer();
    if (unlayeredTables.length > 0) {
      throw new Error(
        `Hay tablas incluidas sin layer asignado: ${unlayeredTables.join(", ")}. Corrige MIGRATION_LAYERS antes de ejecutar la migracion.`,
      );
    }

    const run = await prisma.migrationRun.create({
      data: {
        name: input.runName,
        sourceSnapshot: input.sourceSnapshot,
        dryRun: input.dryRun,
        status: "CREATED",
      },
    });

    try {
      await prisma.migrationRun.update({
        where: { id: run.id },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      });

      for (const layer of MIGRATION_LAYERS) {
        await this.loadLayerToStagingUseCase.execute({
          runId: run.id,
          layer,
          source: input.source,
          batchSize: input.batchSize,
        });

        await this.promoteFromStagingUseCase.execute({
          runId: run.id,
          dryRun: input.dryRun,
        });

        await this.validateLayerUseCase.execute({
          runId: run.id,
          layer,
          source: input.source,
        });
      }

      await prisma.migrationRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return run.id;
    } catch (error) {
      await prisma.migrationRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
