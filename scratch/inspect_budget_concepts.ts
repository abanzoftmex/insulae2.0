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

    // Query active concepts with null group id
    const nullGroupConcepts = await prisma.budgetExpenseConcept.findMany({
      where: {
        condominiumId: condo.id,
        isActive: true,
        budgetGroupId: null,
      },
      orderBy: { name: "asc" }
    });

    console.log(`\nActive concepts with budgetGroupId = null: ${nullGroupConcepts.length}`);
    console.log(JSON.stringify(nullGroupConcepts.map(c => ({ id: c.id, name: c.name, year: c.year, budgetGroup: c.budgetGroup })), null, 2));

    // Query all budget groups
    const groups = await prisma.budgetGroup.findMany({
      where: { condominiumId: condo.id, isActive: true },
      include: {
        concepts: {
          where: { isActive: true }
        }
      }
    });
    console.log(`\nActive budget groups: ${groups.length}`);
    console.log(JSON.stringify(groups.map(g => ({ id: g.id, name: g.name, category: g.category, year: g.year, conceptsCount: g.concepts.length })), null, 2));

  } catch (error) {
    console.error("Error inspecting budget concepts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
