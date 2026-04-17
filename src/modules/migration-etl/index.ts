import { FsLegacySource } from "./infrastructure/fs-legacy-source";
import { RunFullMigrationUseCase } from "./application/run-full-migration.use-case";

interface RunMigrationOptions {
  runName: string;
  sourceSnapshot: string;
  sourceDir: string;
  dryRun: boolean;
  batchSize: number;
}

export async function runFullMigration(options: RunMigrationOptions): Promise<string> {
  const source = new FsLegacySource({ baseDir: options.sourceDir });
  const useCase = new RunFullMigrationUseCase();

  return useCase.execute({
    runName: options.runName,
    sourceSnapshot: options.sourceSnapshot,
    source,
    dryRun: options.dryRun,
    batchSize: options.batchSize,
  });
}
