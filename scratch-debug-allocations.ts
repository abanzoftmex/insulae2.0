import { prisma } from "./src/shared/infrastructure/db/prisma";

function decimalToNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return Number(value);
}

async function main() {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true }
  });
  if (!condo) return;

  const area = await prisma.privateArea.findFirst({
    where: { condominiumId: condo.id, name: "VQ#115-130" },
    select: {
      id: true,
      name: true,
      charges: {
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          interestAmount: true,
          discountAmount: true,
          isCollectible: true,
          periodYear: true,
          periodMonth: true,
          responsibility: true,
          chargeGroupId: true,
          chargeGroup: {
            select: {
              name: true,
              chargeType: true,
              kind: true
            },
          },
          allocations: {
            select: {
              amount: true,
            },
          },
        },
      },
      incomes: {
        where: { isActive: true },
        select: {
          id: true,
          date: true,
          amount: true,
          chargeGroupId: true,
        },
      },
    }
  });

  if (!area) {
    console.log("Area not found");
    return;
  }

  console.log("Area Incomes:");
  console.log(area.incomes.map(i => ({
    id: i.id,
    date: i.date,
    amount: i.amount.toString(),
    chargeGroupId: i.chargeGroupId
  })));

  console.log("Area Charges:");
  const mappedCharges = area.charges.map(c => {
    const dbPaid = c.allocations?.reduce(
      (sum: number, alloc: any) => sum + decimalToNumber(alloc.amount),
      0,
    ) ?? decimalToNumber(c.paidAmount);

    return {
      id: c.id,
      year: c.periodYear,
      month: c.periodMonth,
      groupName: c.chargeGroup.name,
      amount: c.amount.toString(),
      paidAmount: c.paidAmount.toString(),
      dbPaid,
      interest: c.interestAmount.toString(),
      discount: c.discountAmount.toString(),
      isCollectible: c.isCollectible
    };
  });
  console.log(mappedCharges);

  // Run the in-memory allocation simulation
  const inMemoryAllocationsByChargeId = new Map<string, number>();

  const sortedCharges = [...area.charges].sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear;
    }
    return a.periodMonth - b.periodMonth;
  });

  const sortedIncomes = [...area.incomes].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const income of sortedIncomes) {
    const chargeGroupId = income.chargeGroupId;
    if (!chargeGroupId) continue;

    let remainingIncome = decimalToNumber(income.amount);
    const groupCharges = sortedCharges.filter((c) => c.chargeGroupId === chargeGroupId);

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

      if (balance > 0.005) {
        const allocate = Math.min(remainingIncome, balance);
        inMemoryAllocationsByChargeId.set(charge.id, prevAllocated + allocate);
        remainingIncome -= allocate;
        console.log(`Allocating ${allocate} to Charge ${charge.periodYear}-${charge.periodMonth} (ID: ${charge.id}) from Income ${income.id}. Remaining income: ${remainingIncome}`);
      }
    }
  }

  // Print final balances
  console.log("Final Simulation Balances:");
  for (const charge of area.charges) {
    if (charge.periodYear === 2025 && charge.chargeGroup.kind === "ORDINARY") {
      const dbPaid = charge.allocations?.reduce(
        (sum: number, alloc: any) => sum + decimalToNumber(alloc.amount),
        0,
      ) ?? decimalToNumber(charge.paidAmount);
      const inMemoryAllocated = inMemoryAllocationsByChargeId.get(charge.id) ?? 0;
      const paid = dbPaid + inMemoryAllocated;
      const chargedAmount = decimalToNumber(charge.amount);
      const interest = decimalToNumber(charge.interestAmount);
      const discount = decimalToNumber(charge.discountAmount);
      const pending = chargedAmount - paid - discount + interest;
      console.log(`2025-${charge.periodMonth}: charged=${chargedAmount}, paid=${paid} (dbPaid=${dbPaid}, inMemory=${inMemoryAllocated}), interest=${interest}, discount=${discount}, pending=${pending}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
