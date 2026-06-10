import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const lines = await prisma.budgetLine.findMany({
    select: {
      id: true,
      budgetId: true,
      concept: true,
      budgetConceptId: true,
      supplierUrl: true
    }
  });

  console.log("All budget lines count:", lines.length);
  console.log("All budget lines:", JSON.stringify(lines, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
