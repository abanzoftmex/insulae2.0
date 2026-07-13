import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const start = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));

  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: { gte: start, lt: end },
      chargeGroupId: null,
      miscCatalogId: null,
    },
  });

  console.log(`=== Unclassified Incomes for 2025 (Count: ${incomes.length}) ===`);
  let sum = 0;
  for (const inc of incomes.slice(0, 20)) {
    console.log(`- Date: ${inc.date.toISOString().split("T")[0]}, Concept: ${inc.concept}, Amount: ${inc.amount}, legacyId: ${inc.legacyId}`);
    sum += Number(inc.amount);
  }
  console.log("Total sum of slice/all:", sum);
}

main().catch(console.error).finally(() => prisma.$disconnect());
