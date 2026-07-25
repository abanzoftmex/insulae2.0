import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== CONDOS & 2025 INCOMES DATA DISCREPANCY AUDIT ===");

  // 1. All records in `Income` table for 2025
  const incomes2025 = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: {
        gte: new Date("2025-01-01T00:00:00.000Z"),
        lt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
    include: {
      chargeGroup: true,
      miscCatalog: true,
      privateArea: true,
    },
  });

  console.log(`Total Income records in 2025 (Income table): ${incomes2025.length}`);

  let totalIncomeAmount2025 = 0;
  const incomeByGroup: Record<string, number> = {};

  incomes2025.forEach((inc) => {
    const amt = Number(inc.amount);
    totalIncomeAmount2025 += amt;
    const groupName = inc.chargeGroup?.name || inc.miscCatalog?.name || "Sin Clasificación";
    incomeByGroup[groupName] = (incomeByGroup[groupName] || 0) + amt;
  });

  console.log(`Sum of Income table records in 2025: $${totalIncomeAmount2025.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log("Income table totals by Group in 2025:", incomeByGroup);

  // 2. All records in `Payment` / `PaymentDetail` (Area Charges Payments) for 2025
  const paymentDetails2025 = await prisma.paymentDetail.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      payment: {
        paidAt: {
          gte: new Date("2025-01-01T00:00:00.000Z"),
          lt: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
    },
    include: {
      chargeGroup: true,
      payment: true,
    },
  });

  console.log(`\nTotal PaymentDetail records in 2025 (Payment/PaymentDetail table): ${paymentDetails2025.length}`);

  let totalPaymentDetailAmount2025 = 0;
  const paymentDetailByKind: Record<string, number> = {};

  paymentDetails2025.forEach((pd) => {
    const amt = Number(pd.amount);
    totalPaymentDetailAmount2025 += amt;
    const kind = pd.chargeGroup?.kind || "DESCONOCIDO";
    paymentDetailByKind[kind] = (paymentDetailByKind[kind] || 0) + amt;
  });

  console.log(`Sum of PaymentDetail records in 2025: $${totalPaymentDetailAmount2025.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log("PaymentDetail totals by Kind in 2025:", paymentDetailByKind);
}

main().catch(console.error).finally(() => prisma.$disconnect());
