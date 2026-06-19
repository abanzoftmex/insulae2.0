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

    // Find a few 2025 concepts with their budgetGroupId and see what groups they point to
    const concepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, year: 2025, isActive: true },
      take: 5,
      include: { group: true, mappings: true }
    });

    console.log("2025 Concepts Sample:");
    for (const c of concepts) {
      console.log(`Concept: ${c.name} (${c.id})`);
      console.log(`  budgetGroupId (UUID): ${c.budgetGroupId}`);
      console.log(`  group name: ${c.group?.name}, category: ${c.group?.category}, legacyId: ${c.group?.legacyId}`);
      console.log(`  mappings:`, c.mappings.map(m => ({ legacyGroupId: m.budgetGroupId, legacyConceptId: m.legacyBudgetConceptId })));
    }

    // Now let's do the same for 2026 concepts that HAVE a group (if any exist)
    const concepts2026WithGroup = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, year: 2026, isActive: true, budgetGroupId: { not: null } },
      take: 5,
      include: { group: true, mappings: true }
    });

    console.log("\n2026 Concepts with Group Sample:");
    for (const c of concepts2026WithGroup) {
      console.log(`Concept: ${c.name} (${c.id})`);
      console.log(`  budgetGroupId (UUID): ${c.budgetGroupId}`);
      console.log(`  group name: ${c.group?.name}, category: ${c.group?.category}, legacyId: ${c.group?.legacyId}`);
      console.log(`  mappings:`, c.mappings.map(m => ({ legacyGroupId: m.budgetGroupId, legacyConceptId: m.legacyBudgetConceptId })));
    }

    // Let's count how many 2026 active concepts have budgetGroupId !== null vs null
    const countWithGroup = await prisma.budgetExpenseConcept.count({
      where: { condominiumId: condo.id, year: 2026, isActive: true, budgetGroupId: { not: null } }
    });
    const countWithoutGroup = await prisma.budgetExpenseConcept.count({
      where: { condominiumId: condo.id, year: 2026, isActive: true, budgetGroupId: null }
    });
    console.log(`\n2026 Concepts Counts: with group = ${countWithGroup}, without group = ${countWithoutGroup}`);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
