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

  const [totalPromoted, mapped] = await Promise.all([
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

  const missing = Math.max(totalPromoted - mapped, 0);
  const progressPct = totalPromoted === 0 ? 0 : Number(((mapped / totalPromoted) * 100).toFixed(2));

  console.log(
    JSON.stringify(
      {
        runId,
        table: "HISTORICO_PAGOS_HAS_PAGOS",
        totalPromoted,
        mapped,
        missing,
        progressPct,
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
