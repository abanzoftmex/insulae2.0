import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== EXECUTING SYNC: PAYMENT DETAILS TO INCOMES (ALL YEARS) ===");

  // Fetch all active payment details
  const paymentDetails = await prisma.paymentDetail.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      payment: {
        isVisibleInFinancialSummary: true,
      },
    },
    include: {
      payment: { include: { privateArea: true } },
      chargeGroup: true,
    },
  });

  console.log(`Total PaymentDetails in DB: ${paymentDetails.length}`);

  // Fetch existing incomes with externalId or reference
  const existingIncomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
    },
    select: {
      id: true,
      externalId: true,
      reference: true,
      date: true,
      amount: true,
      privateAreaId: true,
      chargeGroupId: true,
    },
  });

  console.log(`Existing Income records in DB: ${existingIncomes.length}`);

  const incomeKeys = new Set<string>();
  existingIncomes.forEach((inc) => {
    if (inc.externalId) incomeKeys.add(`ext:${inc.externalId}`);
    if (inc.reference) incomeKeys.add(`ref:${inc.reference}`);
    const dateStr = inc.date.toISOString().slice(0, 10);
    const amtStr = Number(inc.amount).toFixed(2);
    const areaId = inc.privateAreaId || "";
    const cgId = inc.chargeGroupId || "";
    incomeKeys.add(`comp:${dateStr}_${amtStr}_${areaId}_${cgId}`);
  });

  const toCreate: Array<{
    condominiumId: string;
    chargeGroupId: string | null;
    privateAreaId: string | null;
    date: Date;
    concept: string;
    amount: any;
    paymentMethod: any;
    reference: string | null;
    externalSource: string;
    externalId: string;
    isActive: boolean;
    isConfirmed: boolean;
  }> = [];

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
      const areaName = pd.payment.privateArea?.name || "Área Privativa";
      const groupName = pd.chargeGroup?.name || "Cuotas";
      const concept = pd.payment.notes || (pd.payment.reference ? `Pago Folio: ${pd.payment.reference}` : `Pago ${groupName} ${areaName}`);

      toCreate.push({
        condominiumId: condo.id,
        chargeGroupId: pd.chargeGroupId,
        privateAreaId: pd.payment.privateAreaId,
        date: pd.payment.paidAt,
        concept,
        amount: pd.amount,
        paymentMethod: pd.payment.method,
        reference: pd.payment.reference,
        externalSource: "payment_detail",
        externalId: pd.id,
        isActive: true,
        isConfirmed: true,
      });

      // Avoid creating duplicates within batch
      incomeKeys.add(extKey);
      if (refKey) incomeKeys.add(refKey);
      incomeKeys.add(compKey);
    }
  });

  console.log(`Total missing Income records to create: ${toCreate.length}`);

  if (toCreate.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const chunk = toCreate.slice(i, i + batchSize);
      await prisma.income.createMany({
        data: chunk,
      });
      console.log(`Created chunk ${i / batchSize + 1}/${Math.ceil(toCreate.length / batchSize)} (${chunk.length} items)`);
    }
  }

  console.log("\n=== VERIFYING NEW TOTALS FOR 2025 IN INCOME TABLE ===");
  const year2025Incomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: {
        gte: new Date(Date.UTC(2025, 0, 1)),
        lt: new Date(Date.UTC(2026, 0, 1)),
      },
      chargeGroup: { kind: "ORDINARY" },
    },
  });

  const sum2025 = year2025Incomes.reduce((acc, item) => acc + Number(item.amount), 0);
  console.log(`New 2025 Income Table Cuotas Ordinarias Total: $${sum2025.toLocaleString("en-US", { minimumFractionDigits: 2 })} (from ${year2025Incomes.length} records)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
