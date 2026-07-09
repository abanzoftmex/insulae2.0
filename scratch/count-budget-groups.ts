const { prisma } = require("../src/shared/infrastructure/db/prisma");

async function main() {
  const counts = await prisma.budgetExpenseConcept.groupBy({
    by: ['budgetGroup'],
    _count: true
  });
  console.log("Budget Concept groups count:", counts);
}

main().catch(console.error);
