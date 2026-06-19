import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const lines = await prisma.budgetLine.findMany({
      where: {
        budget: { year: 2025 }
      },
      include: {
        budgetConcept: true
      }
    });

    const matches = lines.filter(l => 
      l.budgetConceptId === "f1ed1518-7092-4ba1-b250-8a85dcd43e9b" || // 2025 active
      l.concept.includes("122")
    );

    console.log("Matching BudgetLines in 2025:");
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
