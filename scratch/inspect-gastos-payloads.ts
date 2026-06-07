import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const counts = await prisma.legacyStagingRow.groupBy({
    by: ['legacyTable'],
    _count: {
      _all: true
    }
  });

  console.log("=== STAGING ROWS COUNTS ===");
  console.log(counts);

  await prisma.$disconnect();
}

main().catch(console.error);
