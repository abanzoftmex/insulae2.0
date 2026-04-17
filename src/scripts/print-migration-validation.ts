import { prisma } from "@/shared/infrastructure/db/prisma";

function readRunId(): string {
  const prefixed = "--runId=";
  const raw = process.argv.find((arg) => arg.startsWith(prefixed));
  if (!raw) {
    throw new Error("Debes indicar --runId=<migration-run-id>");
  }

  return raw.slice(prefixed.length);
}

async function main(): Promise<void> {
  const runId = readRunId();

  const results = await prisma.migrationValidationResult.findMany({
    where: { runId },
    orderBy: [{ layer: "asc" }, { targetTable: "asc" }],
  });

  for (const row of results) {
    const line = [
      row.layer,
      row.targetTable,
      `source=${row.sourceCount}`,
      `staging=${row.stagingCount}`,
      `final=${row.finalCount}`,
      `diff=${row.difference}`,
      `severity=${row.severity}`,
    ].join(" | ");
    process.stdout.write(`${line}\n`);
  }
}

main()
  .catch((error) => {
    process.stderr.write(`Validation report failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
