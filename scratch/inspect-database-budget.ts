import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true }
  });
  if (!condo) {
    console.log("No active condominium found.");
    return;
  }

  const budget = await prisma.budget.findFirst({
    where: { condominiumId: condo.id, year: 2026 },
    include: {
      lines: {
        include: {
          months: true
        }
      }
    }
  });

  if (!budget) {
    console.log("No 2026 budget found.");
    return;
  }

  console.log("Budget ID:", budget.id);
  console.log("Lines count:", budget.lines.length);

  // Group months by month number and count them
  const monthCounts: Record<number, number> = {};
  const monthSumAmount: Record<number, number> = {};

  for (const line of budget.lines) {
    for (const m of line.months) {
      monthCounts[m.month] = (monthCounts[m.month] || 0) + 1;
      monthSumAmount[m.month] = (monthSumAmount[m.month] || 0) + m.amount.toNumber();
    }
  }

  console.log("Month counts in DB:", monthCounts);
  console.log("Month sum amounts in DB:", monthSumAmount);

  // Let's print the first line details as an example
  const firstLine = budget.lines[0];
  if (firstLine) {
    console.log(`First Line concept: ${firstLine.concept}`);
    console.log("Months data for first line:");
    firstLine.months.forEach(m => {
      console.log(`  - Month: ${m.month} | Amount: ${m.amount} | Units: ${m.units}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
