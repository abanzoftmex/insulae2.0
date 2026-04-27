import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const concepts = await prisma.budgetExpenseConcept.findMany({
    where: { isActive: true, legacyBudgetConceptId: { not: null } }
  });

  for (const c of concepts) {
    if (c.name.startsWith("Concepto") && c.legacyBudgetConceptId) {
      const exp = await prisma.expense.findFirst({
        where: { legacyBudgetConceptId: c.legacyBudgetConceptId },
        select: { concept: true }
      });
      if (exp && exp.concept) {
        await prisma.budgetExpenseConcept.update({
          where: { id: c.id },
          data: { name: exp.concept }
        });
        console.log(`Updated ${c.legacyBudgetConceptId} to ${exp.concept}`);
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
