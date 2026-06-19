import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condo) {
      console.log("No active condominium found.");
      return;
    }

    console.log(`Condominium: ${condo.name} (${condo.id})`);

    // Let's get active concepts with null group in 2026
    const nullGroupConcepts = await prisma.budgetExpenseConcept.findMany({
      where: {
        condominiumId: condo.id,
        year: 2026,
        isActive: true,
        budgetGroupId: null,
      },
    });

    console.log(`Found ${nullGroupConcepts.length} active concepts with null group id in 2026`);

    // Let's get ExpenseConceptGroupMap for these concepts in 2026
    const conceptIds = nullGroupConcepts.map(c => c.id);
    const maps = await prisma.expenseConceptGroupMap.findMany({
      where: {
        condominiumId: condo.id,
        year: 2026,
        budgetConceptId: { in: conceptIds },
      },
    });

    console.log(`Found ${maps.length} ExpenseConceptGroupMap records for these concepts in 2026`);
    for (const map of maps) {
      const concept = nullGroupConcepts.find(c => c.id === map.budgetConceptId);
      console.log(`Concept: ${concept?.name} (legacyConceptId: ${map.legacyBudgetConceptId}) -> legacyGroupId: ${map.budgetGroupId}`);
    }

    // Let's see if there are BudgetGroup records for 2026 and their legacyId
    const groups = await prisma.budgetGroup.findMany({
      where: { condominiumId: condo.id, year: 2026 },
    });
    console.log("\nBudgetGroups in 2026:");
    for (const g of groups) {
      console.log(`Group ID: ${g.id}, Name: ${g.name}, Category: ${g.category}, Legacy ID: ${g.legacyId}`);
    }

  } catch (error) {
    console.error("Error checking maps:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
