import { runFullMigration } from "@/modules/migration-etl";

interface CliOptions {
  runName: string;
  sourceSnapshot: string;
  sourceDir: string;
  dryRun: boolean;
  batchSize: number;
}

function readOption(name: string, fallback?: string): string | undefined {
  const prefixed = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefixed));
  if (raw) {
    return raw.slice(prefixed.length);
  }

  return fallback;
}

function parseOptions(): CliOptions {
  const sourceDir = readOption("sourceDir", "data/legacy-export");
  if (!sourceDir) {
    throw new Error("sourceDir es requerido");
  }

  const runName = readOption("runName", `run-${Date.now()}`) ?? `run-${Date.now()}`;
  const sourceSnapshot = readOption("sourceSnapshot", new Date().toISOString()) ?? new Date().toISOString();
  const dryRun = readOption("dryRun", "true") !== "false";
  const batchSize = Number.parseInt(readOption("batchSize", "500") ?? "500", 10);

  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    throw new Error("batchSize debe ser un entero mayor a 0");
  }

  return {
    runName,
    sourceSnapshot,
    sourceDir,
    dryRun,
    batchSize,
  };
}

async function main(): Promise<void> {
  const options = parseOptions();
  const runId = await runFullMigration(options);
  process.stdout.write(`${runId}\n`);
}

main().catch((error) => {
  process.stderr.write(`Migration failed: ${String(error)}\n`);
  process.exit(1);
});
