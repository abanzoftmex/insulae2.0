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

    // Let's get ExpenseConceptGroupMap for 2025
    const maps2025 = await prisma.expenseConceptGroupMap.findMany({
      where: {
        condominiumId: condo.id,
        year: 2025,
      },
    });

    console.log(`Found ${maps2025.length} ExpenseConceptGroupMap records for 2025`);
    const legacyGroupIds = new Set(maps2025.map(m => m.budgetGroupId));
    console.log("Legacy Group IDs mapped in 2025:", Array.from(legacyGroupIds));

    // Let's see BudgetGroup records for 2025
    const groups2025 = await prisma.budgetGroup.findMany({
      where: { condominiumId: condo.id, year: 2025 },
    });
    console.log("\nBudgetGroups in 2025:");
    for (const g of groups2025) {
      console.log(`Group ID: ${g.id}, Name: ${g.name}, Category: ${g.category}, Legacy ID: ${g.legacyId}`);
    }

    // Let's see how concepts in 2025 are linked to budgetGroupId
    const concepts2025 = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, year: 2025, isActive: true },
      include: { group: true }
    });
    const withGroup = concepts2025.filter(c => c.budgetGroupId !== null);
    const withoutGroup = concepts2025.filter(c => c.budgetGroupId === null);
    console.log(`\n2025 Concepts: Total Active = ${concepts2025.length}, with budgetGroupId = ${withGroup.length}, without = ${withoutGroup.length}`);

    // If there are concepts without group, print some
    if (withoutGroup.length > 0) {
      console.log("Sample 2025 concepts without group:", withoutGroup.slice(0, 5).map(c => ({ name: c.name, groupStr: c.budgetGroup })));
    }

  } catch (error) {
    console.error("Error checking 2025 data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
