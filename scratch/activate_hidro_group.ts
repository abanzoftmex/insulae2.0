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

    console.log(`Condominium: ${condo.name}`);

    // Find the 2026 group with legacyId 33
    const group33 = await prisma.budgetGroup.findFirst({
      where: { condominiumId: condo.id, year: 2026, legacyId: 33 }
    });

    if (!group33) {
      console.log("BudgetGroup for legacyId 33 in 2026 not found.");
      return;
    }

    console.log(`Before update - Group active: ${group33.isActive}`);

    // Update the group to be active
    const updatedGroup = await prisma.budgetGroup.update({
      where: { id: group33.id },
      data: { isActive: true }
    });
    console.log(`After update - Group active: ${updatedGroup.isActive}`);

    // Update the active 2026 concept (legacyBudgetConceptId 122) to link to this group
    const concept122 = await prisma.budgetExpenseConcept.findFirst({
      where: { condominiumId: condo.id, year: 2026, legacyBudgetConceptId: 122 }
    });

    if (concept122) {
      console.log(`Before update - Concept name: ${concept122.name}, budgetGroupId: ${concept122.budgetGroupId}, budgetGroup: ${concept122.budgetGroup}`);
      const updatedConcept = await prisma.budgetExpenseConcept.update({
        where: { id: concept122.id },
        data: {
          budgetGroupId: updatedGroup.id,
          budgetGroup: "OTHER" // category of group33 is OTHER
        }
      });
      console.log(`After update - Concept name: ${updatedConcept.name}, budgetGroupId: ${updatedConcept.budgetGroupId}, budgetGroup: ${updatedConcept.budgetGroup}`);
    } else {
      console.log("Concept 122 in 2026 not found.");
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
