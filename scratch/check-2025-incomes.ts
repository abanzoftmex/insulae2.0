import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== AREA CHARGES / ALLOCATIONS IN 2025 ===");
  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      charge: { condominiumId: condo.id, periodYear: 2025 },
    },
    include: {
      charge: {
        include: { chargeGroup: true },
      },
    },
  });

  const allocByKind: Record<string, number> = {};
  allocations.forEach((a) => {
    const kind = a.charge.chargeGroup.kind;
    allocByKind[kind] = (allocByKind[kind] || 0) + Number(a.amount);
  });
  console.log("Allocations by kind in 2025:", allocByKind);

  console.log("\n=== INCOMES (MISC / DIRECT) IN 2025 ===");
  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: {
        gte: new Date("2025-01-01T00:00:00Z"),
        lte: new Date("2025-12-31T23:59:59Z"),
      },
    },
    include: {
      miscCatalog: true,
      chargeGroup: true,
    },
  });

  console.log("Total Income records in 2025:", incomes.length);
  incomes.forEach((inc) => {
    console.log(`- Income: "${inc.concept}" | Amount: ${inc.amount} | Date: ${inc.date.toISOString().slice(0, 10)} | Catalog: "${inc.miscCatalog?.name}" | Kind: ${inc.chargeGroup?.kind}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
