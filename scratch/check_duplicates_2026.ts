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

    const name = "UNIFORMES PERSONAL SEGURIDAD";
    const concepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, year: 2026, name },
      include: { group: true }
    });

    console.log(`Concepts with name '${name}' in 2026:`);
    for (const c of concepts) {
      console.log(`ID: ${c.id}, LegacyConceptId: ${c.legacyBudgetConceptId}, IsActive: ${c.isActive}, budgetGroupId: ${c.budgetGroupId}, Group: ${c.group?.name} (${c.group?.category})`);
    }

    // Let's print some other active concepts in 2026 that have budgetGroupId = null, and see if there are other active concepts with the SAME name that have a group!
    const activeNullGroup = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, year: 2026, isActive: true, budgetGroupId: null },
      orderBy: { name: "asc" }
    });

    console.log(`\nActive 2026 concepts with null group: ${activeNullGroup.length}`);
    for (const c of activeNullGroup.slice(0, 10)) {
      // Find if there is another concept with the same name in 2026
      const other = await prisma.budgetExpenseConcept.findFirst({
        where: { condominiumId: condo.id, year: 2026, name: c.name, id: { not: c.id } },
        include: { group: true }
      });
      console.log(`Concept: ${c.name} (legacyConceptId: ${c.legacyBudgetConceptId})`);
      if (other) {
        console.log(`  -> found another: id: ${other.id}, legacyConceptId: ${other.legacyBudgetConceptId}, isActive: ${other.isActive}, budgetGroupId: ${other.budgetGroupId}, Group: ${other.group?.name} (${other.group?.category})`);
      } else {
        console.log(`  -> unique name!`);
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
