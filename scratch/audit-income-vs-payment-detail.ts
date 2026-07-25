import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const year = 2025;
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  console.log("=== MONTH BY MONTH BREAKDOWN FOR 2025: PAYMENT DETAIL vs INCOME TABLE ===");

  const pdMonthly: number[] = Array(12).fill(0);
  const incMonthly: number[] = Array(12).fill(0);

  // 1. PaymentDetails (ORDINARY)
  const pds = await prisma.paymentDetail.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      chargeGroup: { kind: "ORDINARY" },
      payment: {
        paidAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
        isVisibleInFinancialSummary: true,
      },
    },
    select: {
      amount: true,
      payment: { select: { paidAt: true } },
    },
  });

  pds.forEach((pd) => {
    const m = pd.payment.paidAt.getUTCMonth();
    pdMonthly[m] += Number(pd.amount);
  });

  // 2. Incomes (Cuotas ordinarias)
  const incs = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
      chargeGroup: { kind: "ORDINARY" },
    },
    select: {
      amount: true,
      date: true,
      concept: true,
    },
  });

  incs.forEach((inc) => {
    const m = inc.date.getUTCMonth();
    incMonthly[m] += Number(inc.amount);
  });

  console.log("MES | RESUMEN FINANCIERO (PaymentDetail) | LISTADO INGRESOS (Income Table) | DIFERENCIA");
  console.log("-".repeat(85));
  let totalPd = 0;
  let totalInc = 0;
  for (let i = 0; i < 12; i++) {
    const pd = pdMonthly[i];
    const inc = incMonthly[i];
    const diff = pd - inc;
    totalPd += pd;
    totalInc += inc;
    console.log(
      `${monthNames[i].padEnd(10)} | $${pd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(16)} | $${inc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(16)} | $${diff.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(14)}`
    );
  }
  console.log("-".repeat(85));
  console.log(
    `TOTAL      | $${totalPd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(16)} | $${totalInc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(16)} | $${(totalPd - totalInc).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(14)}`
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
