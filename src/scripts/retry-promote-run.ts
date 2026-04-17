import { prisma } from "@/shared/infrastructure/db/prisma";
import { PromoteFromStagingUseCase } from "@/modules/migration-etl/application/promote-from-staging.use-case";

type Snapshot = {
  pagosPending: number;
  allocPending: number;
  allocErrors: number;
};

async function getSnapshot(runId: string): Promise<Snapshot> {
  const [pagosPending, allocPending, allocErrors] = await Promise.all([
    prisma.legacyStagingRow.count({
      where: { runId, legacyTable: "PAGOS", promotedAt: null },
    }),
    prisma.legacyStagingRow.count({
      where: { runId, legacyTable: "HISTORICO_PAGOS_HAS_PAGOS", promotedAt: null },
    }),
    prisma.legacyStagingRow.count({
      where: {
        runId,
        legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
        promotedAt: null,
        promotionError: { not: null },
      },
    }),
  ]);

  return { pagosPending, allocPending, allocErrors };
}

async function main(): Promise<void> {
  const runId = process.argv.find((arg) => arg.startsWith("--runId="))?.split("=")[1];
  const maxIterationsRaw = process.argv.find((arg) => arg.startsWith("--maxIterations="))?.split("=")[1];
  const maxIterations = maxIterationsRaw ? Number.parseInt(maxIterationsRaw, 10) : 6;

  if (!runId) {
    throw new Error("Missing --runId argument");
  }

  const useCase = new PromoteFromStagingUseCase();

  for (let i = 1; i <= maxIterations; i++) {
    const before = await getSnapshot(runId);
    console.log(`iter=${i} before`, before);

    if (before.pagosPending === 0 && before.allocPending === 0) {
      break;
    }

    await useCase.execute({ runId, dryRun: false });

    const after = await getSnapshot(runId);
    console.log(`iter=${i} after`, after);

    if (after.pagosPending === before.pagosPending && after.allocPending === before.allocPending) {
      break;
    }
  }

  const [pagos, pagosPromoted, pagosPending, alloc, allocPromoted, allocPending, allocErrors] =
    await Promise.all([
      prisma.legacyStagingRow.count({ where: { runId, legacyTable: "PAGOS" } }),
      prisma.legacyStagingRow.count({
        where: { runId, legacyTable: "PAGOS", promotedAt: { not: null } },
      }),
      prisma.legacyStagingRow.count({
        where: { runId, legacyTable: "PAGOS", promotedAt: null },
      }),
      prisma.legacyStagingRow.count({
        where: { runId, legacyTable: "HISTORICO_PAGOS_HAS_PAGOS" },
      }),
      prisma.legacyStagingRow.count({
        where: { runId, legacyTable: "HISTORICO_PAGOS_HAS_PAGOS", promotedAt: { not: null } },
      }),
      prisma.legacyStagingRow.count({
        where: { runId, legacyTable: "HISTORICO_PAGOS_HAS_PAGOS", promotedAt: null },
      }),
      prisma.legacyStagingRow.count({
        where: {
          runId,
          legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
          promotedAt: null,
          promotionError: { not: null },
        },
      }),
    ]);

  console.log(
    JSON.stringify(
      {
        runId,
        pagos: {
          staging: pagos,
          promoted: pagosPromoted,
          pending: pagosPending,
        },
        alloc: {
          staging: alloc,
          promoted: allocPromoted,
          pending: allocPending,
          pendingWithError: allocErrors,
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
