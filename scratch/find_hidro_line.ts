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

    const matches = lines.filter(l => 
      l.budgetConceptId === "59204778-2182-44c6-a19e-260a09e966ad" || // 2026 active
      l.budgetConceptId === "f04e3f48-2a14-49d6-995d-87b0f4ff16ff" || // 2026 inactive
      l.budgetConceptId === "f1ed1518-7092-4ba1-b250-8a85dcd43e9b" || // 2025 active
      l.concept.includes("122") ||
      l.concept.includes("180")
    );

    console.log("Matching BudgetLines in 2026:");
    console.log(JSON.stringify(matches.map(l => ({
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
