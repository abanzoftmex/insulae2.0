import { prisma } from "@/shared/infrastructure/db/prisma";

function readRunId(): string {
  const prefixed = "--runId=";
  const arg = process.argv.find((value) => value.startsWith(prefixed));
  if (!arg) {
    throw new Error("Debes indicar --runId=<migration-run-id>");
  }
  return arg.slice(prefixed.length);
}

async function main(): Promise<void> {
  const runId = readRunId();

  const [pagosStaging, pagosMap, allocStaging, allocMap] = await Promise.all([
    prisma.legacyStagingRow.count({
      where: {
        runId,
        legacyTable: "PAGOS",
        promotedAt: { not: null },
      },
    }),
    prisma.migrationIdMap.count({
      where: {
        runId,
        legacyTable: "PAGOS",
        targetEntity: "Charge",
      },
    }),
    prisma.legacyStagingRow.count({
      where: {
        runId,
        legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
        promotedAt: { not: null },
      },
    }),
    prisma.migrationIdMap.count({
      where: {
        runId,
        legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
        targetEntity: "PaymentAllocation",
      },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        runId,
        PAGOS: {
          stagingPromoted: pagosStaging,
          mapped: pagosMap,
        },
        HISTORICO_PAGOS_HAS_PAGOS: {
          stagingPromoted: allocStaging,
          mapped: allocMap,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
