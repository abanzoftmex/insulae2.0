import { prisma } from "../src/shared/infrastructure/db/prisma";

const AREA_ID = "81aa6f9f-1939-4685-91e1-51f84e7d3d84";

async function main() {
  const charges = await prisma.charge.findMany({
    where: { 
      privateAreaId: AREA_ID,
      isCollectible: true,
      responsibility: "COMMERCE"
    },
    include: {
      allocations: {
        include: {
          payment: true
        }
      }
    }
  });

  let totalCharged = 0;
  let totalPaidWithVisiblePayments = 0;
  let totalPaidAllPayments = 0;

  for (const c of charges) {
    totalCharged += Number(c.amount);
    for (const a of c.allocations) {
      const p = a.payment;
      const amount = Number(a.amount);
      totalPaidAllPayments += amount;
      if (p.isVisibleInFinancialSummary) {
        totalPaidWithVisiblePayments += amount;
      }
    }
  }

  console.log(`COMMERCE Total Charged: $${totalCharged.toFixed(2)}`);
  console.log(`COMMERCE Paid (all allocations): $${totalPaidAllPayments.toFixed(2)}`);
  console.log(`COMMERCE Paid (visible payments only): $${totalPaidWithVisiblePayments.toFixed(2)}`);
  
  const balanceWithVisible = totalCharged - totalPaidWithVisiblePayments;
  const balanceAll = totalCharged - totalPaidAllPayments;
  console.log(`Balance with visible payments: $${balanceWithVisible.toFixed(2)}`);
  console.log(`Balance with all payments: $${balanceAll.toFixed(2)}`);

  // Now, what about "Debe al dia" (charges where period is past or current)
  const todayYear = 2026;
  const todayMonth = 6;
  const isPastOrCurrentPeriod = (year: number, month: number) => {
    return year < todayYear || (year === todayYear && month <= todayMonth);
  };
  
  let dueCharged = 0;
  let duePaidWithVisible = 0;
  for (const c of charges) {
    if (isPastOrCurrentPeriod(c.periodYear, c.periodMonth)) {
      dueCharged += Number(c.amount);
      for (const a of c.allocations) {
        if (a.payment.isVisibleInFinancialSummary) {
          duePaidWithVisible += Number(a.amount);
        }
      }
    }
  }
  const dueBalance = dueCharged - duePaidWithVisible;
  console.log(`\nCOMMERCE Due Charged (past/current): $${dueCharged.toFixed(2)}`);
  console.log(`COMMERCE Due Paid (past/current, visible): $${duePaidWithVisible.toFixed(2)}`);
  console.log(`COMMERCE DEBE AL DIA: $${dueBalance.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(console.error);
