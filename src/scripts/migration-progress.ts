import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const run = await prisma.migrationRun.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!run) {
    console.log(JSON.stringify({ status: "NO_RUNS" }, null, 2));
    return;
  }

  const [totalStaging, promoted, pendingWithError] = await Promise.all([
    prisma.legacyStagingRow.count({ where: { runId: run.id } }),
    prisma.legacyStagingRow.count({
      where: { runId: run.id, promotedAt: { not: null } },
    }),
    prisma.legacyStagingRow.count({
      where: {
        runId: run.id,
        promotedAt: null,
        promotionError: { not: null },
      },
    }),
  ]);

  const pending = totalStaging - promoted;
  const progressPct = totalStaging === 0 ? 0 : Math.round((promoted / totalStaging) * 10000) / 100;

  console.log(
    JSON.stringify(
      {
        runId: run.id,
        status: run.status,
        totalStaging,
        promoted,
        pending,
        pendingWithError,
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
