import { prisma } from "./src/shared/infrastructure/db/prisma";

function decimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

async function main() {
  const areaId = "81aa6f9f-1939-4685-91e1-51f84e7d3d84";
  const area = await prisma.privateArea.findUnique({
    where: { id: areaId },
    include: {
      charges: {
        include: {
          chargeGroup: true,
          allocations: {
            include: {
              payment: true
            }
          }
        }
      },
      incomes: true
    }
  });

  if (!area) return;

  const inMemoryAllocationsByChargeId = new Map<string, number>();

  const sortedCharges = [...area.charges].sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear;
    }
    return a.periodMonth - b.periodMonth;
  });

  const sortedIncomes = [...area.incomes].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build a set of legacyIds of payments that already have allocations in the database
  const allocatedLegacyIds = new Set<number>();
  for (const charge of area.charges) {
    for (const alloc of charge.allocations) {
      if (alloc.payment?.legacyId !== null && alloc.payment?.legacyId !== undefined) {
        allocatedLegacyIds.add(alloc.payment.legacyId);
      }
    }
  }

  console.log("Allocated legacy IDs in DB:", Array.from(allocatedLegacyIds));

  for (const income of sortedIncomes) {
    if (income.legacyId !== null && income.legacyId !== undefined && allocatedLegacyIds.has(income.legacyId)) {
      console.log(`Skipping income legacyId=${income.legacyId} (already in DB allocations)`);
      continue;
    }

    const chargeGroupId = income.chargeGroupId;
    if (!chargeGroupId) {
      console.log(`Skipping income date=${income.date.toISOString().slice(0, 10)}: no chargeGroupId`);
      continue;
    }

    let remainingIncome = decimalToNumber(income.amount);
    const groupCharges = sortedCharges.filter((c) => c.chargeGroupId === chargeGroupId);

    console.log(`\nProcessing income date=${income.date.toISOString().slice(0, 10)}, amount=${remainingIncome}, groupChargesCount=${groupCharges.length}`);

    for (const charge of groupCharges) {
      if (remainingIncome <= 0.005) break;

      const dbPaid = charge.allocations?.reduce(
        (sum: number, alloc: any) => sum + decimalToNumber(alloc.amount),
        0,
      ) ?? decimalToNumber(charge.paidAmount);
      const prevAllocated = inMemoryAllocationsByChargeId.get(charge.id) ?? 0;
      const currentPaid = dbPaid + prevAllocated;

      const chargedAmount = decimalToNumber(charge.amount);
      const interest = decimalToNumber(charge.interestAmount);
      const discount = decimalToNumber(charge.discountAmount);
      const balance = chargedAmount - currentPaid + interest - discount;

      console.log(`  - Charge ${charge.periodYear}-${charge.periodMonth}: charged=${chargedAmount}, dbPaid=${dbPaid}, prevAllocated=${prevAllocated}, balance=${balance}`);

      if (balance > 0.005) {
        const allocate = Math.min(remainingIncome, balance);
        inMemoryAllocationsByChargeId.set(charge.id, prevAllocated + allocate);
        remainingIncome -= allocate;
        console.log(`    ALLOCATED ${allocate}, remainingIncome=${remainingIncome}`);
      }
    }
  }

  console.log("\n=== FINAL BALANCES ===");
  for (const charge of sortedCharges) {
    const dbPaid = charge.allocations?.reduce(
      (sum: number, alloc: any) => sum + decimalToNumber(alloc.amount),
      0,
    ) ?? decimalToNumber(charge.paidAmount);
    const inMem = inMemoryAllocationsByChargeId.get(charge.id) ?? 0;
    const pending = decimalToNumber(charge.amount) - (dbPaid + inMem);
    console.log(`Charge ${charge.periodYear}-${charge.periodMonth}: dbPaid=${dbPaid}, inMem=${inMem}, pending=${pending}`);
  }
}

main().catch(console.error);
