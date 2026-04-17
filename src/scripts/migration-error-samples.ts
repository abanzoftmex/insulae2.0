import { prisma } from "@/shared/infrastructure/db/prisma";

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main(): Promise<void> {
  const runId = readArg("runId");
  const legacyTable = readArg("legacyTable");
  const takeRaw = readArg("take");
  const take = takeRaw ? Number.parseInt(takeRaw, 10) : 20;

  if (!runId || !legacyTable) {
    throw new Error("Debes indicar --runId=<id> y --legacyTable=<tabla>");
  }

  const rows = await prisma.legacyStagingRow.findMany({
    where: {
      runId,
      legacyTable,
      promotedAt: null,
      promotionError: { not: null },
    },
    orderBy: { legacyId: "asc" },
    take,
    select: {
      id: true,
      legacyId: true,
      promotionError: true,
      payload: true,
    },
  });

  console.log(JSON.stringify({ runId, legacyTable, count: rows.length, rows }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
