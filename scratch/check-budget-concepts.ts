const { prisma } = require("../src/shared/infrastructure/db/prisma");

async function main() {
  const concepts = await prisma.budgetExpenseConcept.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      year: true,
      budgetGroup: true,
      group: {
        select: {
          id: true,
          name: true,
          category: true
        }
      }
    },
    take: 10
  });
  console.log("Concepts:", concepts);
}

main().catch(console.error);
