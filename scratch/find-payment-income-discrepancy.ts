import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== ANALYZING DISCREPANCY REASONS ===");

  const payments2025 = await prisma.payment.findMany({
    where: {
      condominiumId: condo.id,
      isVisibleInFinancialSummary: true,
      paidAt: {
        gte: new Date(Date.UTC(2025, 0, 1)),
        lt: new Date(Date.UTC(2026, 0, 1)),
      },
    },
    include: {
      details: {
        include: { chargeGroup: true },
      },
      privateArea: true,
    },
  });

  console.log("Total visible Payments in Payment table for 2025:", payments2025.length);

  const janPayments = payments2025.filter(
    (p) => p.paidAt.getUTCMonth() === 0 && p.details.some((d) => d.chargeGroup?.kind === "ORDINARY")
  );
  const janPaymentTotal = janPayments.reduce(
    (sum, p) =>
      sum +
      p.details
        .filter((d) => d.chargeGroup?.kind === "ORDINARY")
        .reduce((s, d) => s + Number(d.amount), 0),
    0
  );

  console.log(`\nJanuary 2025 PaymentDetail Ordinary Total: $${janPaymentTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} (from ${janPayments.length} payments)`);

  const janIncomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: {
        gte: new Date(Date.UTC(2025, 0, 1)),
        lt: new Date(Date.UTC(2025, 1, 1)),
      },
      chargeGroup: { kind: "ORDINARY" },
    },
    include: {
      privateArea: true,
    },
  });

  const janIncomeTotal = janIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
  console.log(`January 2025 Income Table Ordinary Total: $${janIncomeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} (from ${janIncomes.length} income entries)`);

  console.log("\n--- Sample Payments in January (PaymentDetail) ---");
  janPayments.slice(0, 5).forEach((p) => {
    const ordAmt = p.details.filter(d => d.chargeGroup?.kind === "ORDINARY").reduce((s, d) => s + Number(d.amount), 0);
    console.log(`- Payment ID: ${p.id} | OrdAmount: $${ordAmt} | Date: ${p.paidAt.toISOString().slice(0, 10)} | Area: ${p.privateArea?.name} | Method: ${p.method}`);
  });

  console.log("\n--- Sample Incomes in January (Income Table) ---");
  janIncomes.slice(0, 5).forEach((inc) => {
    console.log(`- Income ID: ${inc.id} | Amount: $${inc.amount} | Date: ${inc.date.toISOString().slice(0, 10)} | Area: ${inc.privateArea?.name} | Concept: ${inc.concept}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
