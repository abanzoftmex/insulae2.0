import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const lines = await prisma.budgetLine.findMany({
      where: {
        budget: { year: 2026 }
      },
      include: {
        budgetConcept: true
      }
    });

    const matchingLines = lines.filter(l => l.concept.includes("Proyecto Hidrosanitario") || l.concept.includes("Proyecto Eléctrico"));
    console.log("BudgetLines for 'Proyecto Hidrosanitario...' in 2026:");
    console.log(JSON.stringify(matchingLines.map(l => ({
      id: l.id,
      concept: l.concept,
      unitCost: l.unitCost,
      budgetConceptId: l.budgetConceptId,
      budgetConceptYear: l.budgetConcept?.year,
      budgetConceptName: l.budgetConcept?.name
    })), null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
