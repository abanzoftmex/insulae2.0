import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const run = await prisma.migrationRun.findFirst({ orderBy: { createdAt: "desc" } });

  if (!run) {
    console.log(JSON.stringify({ status: "NO_RUN" }, null, 2));
    return;
  }

  const [maxLoaded, maxPromoted, pendingTop] = await Promise.all([
    prisma.legacyStagingRow.aggregate({ where: { runId: run.id }, _max: { loadedAt: true } }),
    prisma.legacyStagingRow.aggregate({ where: { runId: run.id }, _max: { promotedAt: true } }),
    prisma.legacyStagingRow.groupBy({
      by: ["legacyTable"],
      where: { runId: run.id, promotedAt: null },
      _count: { _all: true },
      orderBy: { _count: { legacyTable: "desc" } },
      take: 8,
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        runId: run.id,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        maxLoadedAt: maxLoaded._max.loadedAt,
        maxPromotedAt: maxPromoted._max.promotedAt,
        topPending: pendingTop,
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
