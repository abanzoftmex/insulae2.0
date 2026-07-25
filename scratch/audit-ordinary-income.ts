import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const year = 2025;
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  console.log("=== AUDITING FINANCIAL SUMMARY CALCULATION FOR 2025 ===");

  // 1. PaymentDetails in 2025
  const paymentDetails = await prisma.paymentDetail.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      payment: {
        paidAt: { gte: from, lt: to },
      },
    },
    include: {
      chargeGroup: true,
      payment: true,
    },
  });

  console.log("Total paymentDetails in 2025:", paymentDetails.length);

  // Group by chargeGroup.kind
  const pdByKind: Record<string, number> = {};
  paymentDetails.forEach((pd) => {
    const k = pd.chargeGroup?.kind || "NULL";
    pdByKind[k] = (pdByKind[k] || 0) + Number(pd.amount);
  });
  console.log("PaymentDetails by Kind in 2025:", pdByKind);

  // 2. Let's check if PaymentDetails are filtered by payment.isVisibleInFinancialSummary or method or something
  const pdFiltered = paymentDetails.filter((pd) => pd.payment.isVisibleInFinancialSummary !== false);
  const pdFilteredByKind: Record<string, number> = {};
  pdFiltered.forEach((pd) => {
    const k = pd.chargeGroup?.kind || "NULL";
    pdFilteredByKind[k] = (pdFilteredByKind[k] || 0) + Number(pd.amount);
  });
  console.log("PaymentDetails (isVisibleInFinancialSummary !== false) by Kind in 2025:", pdFilteredByKind);

  // 3. Let's check PaymentAllocations by charge.periodYear vs payment.paidAt year
  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      charge: { condominiumId: condo.id, periodYear: 2025 },
      payment: { isActive: true },
    },
    include: {
      charge: { include: { chargeGroup: true } },
      payment: true,
    },
  });

  const allocByKind: Record<string, number> = {};
  allocations.forEach((a) => {
    const k = a.charge.chargeGroup.kind;
    allocByKind[k] = (allocByKind[k] || 0) + Number(a.amount);
  });
  console.log("PaymentAllocations where charge.periodYear = 2025 by Kind:", allocByKind);

  // 4. Let's check Income table for 2025
  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: { gte: from, lt: to },
    },
    include: {
      chargeGroup: true,
      miscCatalog: true,
    },
  });

  const incomeByKindOrName: Record<string, number> = {};
  incomes.forEach((inc) => {
    const key = inc.chargeGroup?.kind || inc.chargeGroup?.name || inc.miscCatalog?.name || "SIN_GRUPO";
    incomeByKindOrName[key] = (incomeByKindOrName[key] || 0) + Number(inc.amount);
  });
  console.log("Incomes table (date in 2025) grouped by Kind/Group:", incomeByKindOrName);
}

main().catch(console.error).finally(() => prisma.$disconnect());
