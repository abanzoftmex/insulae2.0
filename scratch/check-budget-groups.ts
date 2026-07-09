const { prisma } = require("../src/shared/infrastructure/db/prisma");

async function main() {
  const groups = await prisma.budgetGroup.findMany({
    select: {
      id: true,
      name: true,
      year: true,
      legacyId: true,
      category: true
    }
  });
  console.log("Budget Groups:", groups);
}

main().catch(console.error);
