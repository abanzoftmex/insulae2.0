import { prisma } from "../src/shared/infrastructure/db/prisma";

const AREA_ID = "81aa6f9f-1939-4685-91e1-51f84e7d3d84";

async function main() {
  const charges = await prisma.charge.findMany({
    where: { 
      privateAreaId: AREA_ID,
      isCollectible: true, // ONLY ACTIVE/COLLECTIBLE CHARGES
    },
    orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
    include: {
      chargeGroup: { select: { name: true, chargeType: true } },
      allocations: { include: { payment: { select: { id: true, amount: true } } } },
    },
  });

  // Summarize by responsibility
  const byResp: Record<string, { count: number; totalCharge: number; totalPaid: number; totalInterest: number; totalDiscount: number }> = {};
  for (const c of charges) {
    const r = (c as any).responsibility ?? "NULL";
    if (!byResp[r]) byResp[r] = { count: 0, totalCharge: 0, totalPaid: 0, totalInterest: 0, totalDiscount: 0 };
    const amount = Number(c.amount);
    const paid = c.allocations.reduce((s, a) => s + Number(a.amount), 0);
    const interest = Number(c.interestAmount ?? 0);
    const discount = Number(c.discountAmount ?? 0);
    byResp[r].count++;
    byResp[r].totalCharge += amount;
    byResp[r].totalPaid += paid;
    byResp[r].totalInterest += interest;
    byResp[r].totalDiscount += discount;
  }

  console.log("\n=== COLLECTIBLE CHARGES BY RESPONSIBILITY IN NEON ===");
  for (const [resp, data] of Object.entries(byResp)) {
    const balance = data.totalCharge - data.totalPaid + data.totalInterest - data.totalDiscount;
    console.log(`  ${resp}: ${data.count} charges | total=$${data.totalCharge.toFixed(2)} | paid=$${data.totalPaid.toFixed(2)} | interest=$${data.totalInterest.toFixed(2)} | discount=$${data.totalDiscount.toFixed(2)} | balance=$${balance.toFixed(2)}`);
  }

  // Show detailed group breakdown for COMMERCE
  console.log("\n=== COMMERCE COLLECTIBLE DETAIL BY GROUP ===");
  const commCharges = charges.filter(c => c.responsibility === "COMMERCE");
  const byGroup: Record<string, { count: number; charged: number; paid: number; interest: number }> = {};
  for (const c of commCharges) {
    const gn = c.chargeGroup.name;
    if (!byGroup[gn]) byGroup[gn] = { count: 0, charged: 0, paid: 0, interest: 0 };
    byGroup[gn].count++;
    byGroup[gn].charged += Number(c.amount);
    byGroup[gn].paid += c.allocations.reduce((s, a) => s + Number(a.amount), 0);
    byGroup[gn].interest += Number(c.interestAmount);
  }
  for (const [g, data] of Object.entries(byGroup)) {
    const bal = data.charged - data.paid + data.interest;
    console.log(`  ${g}: ${data.count} charges | charged=$${data.charged.toFixed(2)} | paid=$${data.paid.toFixed(2)} | interest=$${data.interest.toFixed(2)} | balance=$${bal.toFixed(2)}`);
  }

  // Check past or current period filter
  const todayYear = 2026;
  const todayMonth = 6;
  const isPastOrCurrentPeriod = (year: number, month: number) => {
    return year < todayYear || (year === todayYear && month <= todayMonth);
  };
  const dueCommCharges = commCharges.filter(c => isPastOrCurrentPeriod(c.periodYear, c.periodMonth));
  const dueByGroup: Record<string, { count: number; charged: number; paid: number; interest: number }> = {};
  let totalDueComm = 0;
  for (const c of dueCommCharges) {
    const gn = c.chargeGroup.name;
    if (!dueByGroup[gn]) dueByGroup[gn] = { count: 0, charged: 0, paid: 0, interest: 0 };
    dueByGroup[gn].count++;
    const amt = Number(c.amount);
    const pd = c.allocations.reduce((s, a) => s + Number(a.amount), 0);
    const intr = Number(c.interestAmount);
    dueByGroup[gn].charged += amt;
    dueByGroup[gn].paid += pd;
    dueByGroup[gn].interest += intr;
    totalDueComm += (amt - pd + intr);
  }
  console.log("\n=== COMMERCE DUE COLLECTIBLE BY GROUP ===");
  for (const [g, data] of Object.entries(dueByGroup)) {
    const bal = data.charged - data.paid + data.interest;
    console.log(`  ${g}: ${data.count} charges | charged=$${data.charged.toFixed(2)} | paid=$${data.paid.toFixed(2)} | interest=$${data.interest.toFixed(2)} | balance=$${bal.toFixed(2)}`);
  }
  console.log(`  TOTAL DUE COMMERCE: $${totalDueComm.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(console.error);
