import { prisma } from "../src/shared/infrastructure/db/prisma";
import { PrismaBudgetRepository } from "../src/modules/budget/infrastructure/prisma-budget.repository";

async function main() {
  const repo = new PrismaBudgetRepository();
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.error("No active condo found");
    return;
  }
  console.log("Condo:", condo.id, condo.name);

  const budget = await prisma.budget.findFirst({
    where: { condominiumId: condo.id, year: 2026 }
  });
  if (!budget) {
    console.error("No budget for 2026 found");
    return;
  }
  console.log("Budget:", budget.id, budget.status);

  const concept = await prisma.budgetExpenseConcept.findFirst({
    where: { condominiumId: condo.id, year: 2026, isActive: true }
  });
  if (!concept) {
    console.error("No active concept for 2026 found");
    return;
  }
  console.log("Concept:", concept.id, concept.name);

  // Try updating supplierUrl
  const testUrl = "https://example.com/test-pdf.pdf";
  console.log("Updating supplierUrl to:", testUrl);
  await repo.updateSupplierUrl(budget.id, concept.id, testUrl);

  // Read back
  const updatedLine = await prisma.budgetLine.findFirst({
    where: { budgetId: budget.id, budgetConceptId: concept.id }
  });
  console.log("Updated line in DB:", JSON.stringify(updatedLine, null, 2));

  // Get budget VM
  const vm = await repo.getBudget(condo.id, 2026);
  const foundConcept = vm.groups
    .flatMap(g => g.concepts)
    .find(c => c.conceptId === concept.id);
  console.log("Concept in VM:", JSON.stringify(foundConcept, null, 2));

  // Clean up
  console.log("Cleaning up test URL...");
  await repo.updateSupplierUrl(budget.id, concept.id, null);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
