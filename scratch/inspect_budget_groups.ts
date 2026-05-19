import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  try {
    console.log("Fetching distinct budgetGroup values...");
    const groups = await prisma.budgetExpenseConcept.findMany({
      select: {
        budgetGroup: true
      },
      distinct: ['budgetGroup']
    });
    console.log("Distinct groups in DB:", JSON.stringify(groups, null, 2));

    const conceptsCount = await prisma.budgetExpenseConcept.count();
    console.log("Total concepts:", conceptsCount);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
