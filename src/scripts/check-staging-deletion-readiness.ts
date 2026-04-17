import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const runs = await prisma.migrationRun.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  });

  const summary = [] as Array<{
    runId: string;
    status: string;
    createdAt: Date;
    stagingRows: number;
    pendingRows: number;
    errorRows: number;
  }>;

  for (const run of runs) {
    const [stagingRows, pendingRows, errorRows] = await Promise.all([
      prisma.legacyStagingRow.count({ where: { runId: run.id } }),
      prisma.legacyStagingRow.count({ where: { runId: run.id, promotedAt: null } }),
      prisma.legacyStagingRow.count({
        where: { runId: run.id, promotedAt: null, promotionError: { not: null } },
      }),
    ]);

    summary.push({
      runId: run.id,
      status: run.status,
      createdAt: run.createdAt,
      stagingRows,
      pendingRows,
      errorRows,
    });
  }

  const totalStagingRows = summary.reduce((acc, row) => acc + row.stagingRows, 0);
  const deletableRuns = summary.filter((row) => row.pendingRows === 0).map((row) => row.runId);

  console.log(
    JSON.stringify(
      {
        runs: summary,
        totals: {
          runCount: summary.length,
          totalStagingRows,
          deletableRunCount: deletableRuns.length,
          deletableRuns,
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
