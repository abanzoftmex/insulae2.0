import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condo) return;

    // Find any expense in 2026 (date between 2026-01-01 and 2026-12-31) that points to a concept from another year
    const badExpenses = await prisma.expense.findMany({
      where: {
        condominiumId: condo.id,
        date: {
          gte: new Date("2026-01-01T00:00:00Z"),
          lt: new Date("2027-01-01T00:00:00Z")
        },
        budgetConcept: {
          year: { not: 2026 }
        }
      },
      include: {
        budgetConcept: true
      }
    });

    console.log(`Found ${badExpenses.length} expenses in 2026 pointing to non-2026 concepts:`);
    for (const exp of badExpenses) {
      console.log(`Expense ID: ${exp.id}, Concept: ${exp.concept}, Amount: ${exp.amount}, Date: ${exp.date.toISOString()} -> Concept Year: ${exp.budgetConcept?.year}, Concept Name: ${exp.budgetConcept?.name}`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
