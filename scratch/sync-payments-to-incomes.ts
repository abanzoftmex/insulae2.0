import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== DRY RUN: SYNCING PAYMENT DETAILS TO INCOMES FOR 2025 ===");

  const year = 2025;
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  // Fetch all payment details in 2025
  const paymentDetails = await prisma.paymentDetail.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      payment: {
        paidAt: { gte: from, lt: to },
        isVisibleInFinancialSummary: true,
      },
    },
    include: {
      payment: { include: { privateArea: true } },
      chargeGroup: true,
    },
  });

  console.log(`Total PaymentDetails in 2025: ${paymentDetails.length}`);

  // Fetch existing incomes in 2025
  const existingIncomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: { gte: from, lt: to },
    },
  });

  console.log(`Existing Income records in 2025: ${existingIncomes.length}`);

  // Build lookup keys from existing incomes
  const incomeKeys = new Set<string>();
  existingIncomes.forEach((inc) => {
    if (inc.externalId) incomeKeys.add(`ext:${inc.externalId}`);
    if (inc.reference) incomeKeys.add(`ref:${inc.reference}`);
    // Also composite key: date_amount_areaId_chargeGroupId
    const dateStr = inc.date.toISOString().slice(0, 10);
    const amtStr = Number(inc.amount).toFixed(2);
    const areaId = inc.privateAreaId || "";
    const cgId = inc.chargeGroupId || "";
    incomeKeys.add(`comp:${dateStr}_${amtStr}_${areaId}_${cgId}`);
  });

  const missingDetails: typeof paymentDetails = [];

  paymentDetails.forEach((pd) => {
    const extKey = `ext:${pd.id}`;
    const refKey = pd.payment.reference ? `ref:${pd.payment.reference}` : "";
    const dateStr = pd.payment.paidAt.toISOString().slice(0, 10);
    const amtStr = Number(pd.amount).toFixed(2);
    const areaId = pd.payment.privateAreaId || "";
    const cgId = pd.chargeGroupId || "";
    const compKey = `comp:${dateStr}_${amtStr}_${areaId}_${cgId}`;

    const isMatch =
      incomeKeys.has(extKey) ||
      (refKey && incomeKeys.has(refKey)) ||
      incomeKeys.has(compKey);

    if (!isMatch) {
      missingDetails.push(pd);
    }
  });

  console.log(`Missing PaymentDetails to sync to Income table: ${missingDetails.length}`);

  let missingAmountTotal = 0;
  missingDetails.forEach((pd) => {
    missingAmountTotal += Number(pd.amount);
  });

  console.log(`Total Amount of Missing PaymentDetails: $${missingAmountTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  console.log("\nSample missing details to be created:");
  missingDetails.slice(0, 10).forEach((pd) => {
    console.log(
      `- Date: ${pd.payment.paidAt.toISOString().slice(0, 10)} | Amount: $${pd.amount} | Area: ${pd.payment.privateArea?.name} | Group: ${pd.chargeGroup?.name} (${pd.chargeGroup?.kind}) | Ref: ${pd.payment.reference || "N/A"}`
    );
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
