const { prisma } = require("../src/shared/infrastructure/db/prisma");

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(2025, 0, 1)),
        lt: new Date(Date.UTC(2026, 0, 1))
      }
    },
    select: {
      id: true,
      concept: true,
      amount: true,
      date: true,
      isActive: true,
      budgetConceptId: true,
      budgetConcept: {
        select: {
          id: true,
          year: true,
          name: true,
          budgetGroup: true,
          isActive: true
        }
      }
    },
    take: 10
  });
  console.log("Expenses:", expenses);
}

main().catch(console.error);
