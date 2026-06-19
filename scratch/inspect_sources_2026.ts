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

    // Group 2026 concepts by source and isActive and whether they have budgetGroupId
    const summary = await prisma.budgetExpenseConcept.groupBy({
      by: ["source", "isActive", "budgetGroupId"],
      where: { condominiumId: condo.id, year: 2026 },
      _count: { id: true }
    });

    console.log("Summary of 2026 budget expense concepts:");
    console.log(JSON.stringify(summary, null, 2));

    // Let's also check if there are actual BudgetLine records for year 2026.
    // Which concepts are referenced in BudgetLines in 2026?
    const budgetLines = await prisma.budgetLine.findMany({
      where: {
        budget: { condominiumId: condo.id, year: 2026 }
      },
      include: {
        budgetConcept: true
      }
    });

    console.log(`\nFound ${budgetLines.length} budget lines in 2026.`);
    const activeConceptIdsInLines = new Set(budgetLines.map(l => l.budgetConceptId).filter(Boolean));
    console.log(`Unique concept IDs referenced in 2026 budget lines: ${activeConceptIdsInLines.size}`);

    // Let's count how many of these concept IDs have a null budgetGroupId vs non-null
    let nullGroupCount = 0;
    let nonNullGroupCount = 0;
    for (const id of activeConceptIdsInLines) {
      const c = await prisma.budgetExpenseConcept.findUnique({ where: { id: id! } });
      if (c?.budgetGroupId === null) {
        nullGroupCount++;
        console.log(`  Line concept with NULL group: ${c.name} (legacyConceptId: ${c.legacyBudgetConceptId})`);
      } else {
        nonNullGroupCount++;
      }
    }
    console.log(`Referenced concepts: with group = ${nonNullGroupCount}, with NULL group = ${nullGroupCount}`);

    // Let's check Expenses in 2026: how many are associated with concepts with null group vs non-null group
    const expenses = await prisma.expense.findMany({
      where: {
        condominiumId: condo.id,
        isActive: true,
        date: {
          gte: new Date("2026-01-01T00:00:00Z"),
          lt: new Date("2027-01-01T00:00:00Z")
        }
      },
      include: {
        budgetConcept: true
      }
    });

    console.log(`\nFound ${expenses.length} active expenses in 2026.`);
    const expenseConceptIds = new Set(expenses.map(e => e.budgetConceptId).filter(Boolean));
    let expNullGroup = 0;
    let expNonNullGroup = 0;
    for (const id of expenseConceptIds) {
      const c = await prisma.budgetExpenseConcept.findUnique({ where: { id: id! } });
      if (c?.budgetGroupId === null) {
        expNullGroup++;
        console.log(`  Expense concept with NULL group: ${c.name} (legacyConceptId: ${c.legacyBudgetConceptId})`);
      } else {
        expNonNullGroup++;
      }
    }
    console.log(`Unique expense concepts in 2026: with group = ${expNonNullGroup}, with NULL group = ${expNullGroup}`);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
