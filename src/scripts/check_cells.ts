import { prisma } from "../shared/infrastructure/db/prisma";

// Copying logic from buildFinancialCells to see what it outputs for VQ#01A-010
function decimalToNumber(val: any): number {
  return val ? Number(val) : 0;
}

function resolveChargeGroupKind(cg: any): string {
  return cg?.kind || "";
}

function isChargeGroup(charge: any, expectedKind: string): boolean {
  return resolveChargeGroupKind(charge.chargeGroup) === expectedKind;
}

function toPendingAmount(charge: any, inMemoryAllocationsByChargeId: Map<string, number>): number {
  const dbPaid = charge.allocations.reduce((sum: number, a: any) => sum + Number(a.amount), 0);
  const inMemoryAllocated = inMemoryAllocationsByChargeId?.get(charge.id) ?? 0;
  const paidAmount = dbPaid + inMemoryAllocated;
  const amount = decimalToNumber(charge.amount);
  const interestAmount = decimalToNumber(charge.interestAmount);
  const discountAmount = decimalToNumber(charge.discountAmount);
  return Math.max(0, amount - paidAmount - discountAmount + interestAmount);
}

function emptyFinancialSplit() {
  return { owner: 0, commerce: 0 };
}

function addToFinancialSplit(split: any, responsibility: string, value: number) {
  if (responsibility === "COMMERCE") {
    split.commerce += value;
  } else {
    split.owner += value;
  }
}

function splitCharges(charges: any[], predicate: (c: any) => boolean, amountSelector: (c: any) => number) {
  const split = emptyFinancialSplit();
  for (const c of charges) {
    if (predicate(c)) {
      addToFinancialSplit(split, c.responsibility, amountSelector(c));
    }
  }
  return split;
}

async function main() {
  const areaId = "81aa6f9f-1939-4685-91e1-51f84e7d3d84";
  const charges = await prisma.charge.findMany({
    where: { privateAreaId: areaId },
    include: {
      chargeGroup: true,
      allocations: true,
    },
  });

  const inMemoryAllocationsByChargeId = new Map<string, number>();

  const currentOrdinaryYear = 2025;
  const nextOrdinaryYear = 2026;
  const previousOrdinaryYear = 2024;

  const cells: any = {
    arrears_2017_2024: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, "ORDINARY") &&
        charge.periodYear <= previousOrdinaryYear,
      (charge) => toPendingAmount(charge, inMemoryAllocationsByChargeId),
    ),
    advance_2024: splitCharges(
      charges,
      (charge) =>
        isChargeGroup(charge, "ORDINARY") &&
        charge.periodYear === previousOrdinaryYear,
      (charge) => decimalToNumber(charge.paidAmount),
    ),
    ordinary_2025_annual: splitCharges(
      charges,
      (charge) =>
        isChargeGroup(charge, "ORDINARY") &&
        charge.periodYear === currentOrdinaryYear,
      (charge) => decimalToNumber(charge.amount),
    ),
    ordinary_2025_outstanding: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, "ORDINARY") &&
        charge.periodYear === currentOrdinaryYear,
      (charge) => toPendingAmount(charge, inMemoryAllocationsByChargeId),
    ),
    total_outstanding: splitCharges(
      charges,
      (charge) => charge.isCollectible,
      (charge) => toPendingAmount(charge, inMemoryAllocationsByChargeId),
    ),
  };

  for (let month = 1; month <= 12; month++) {
    cells[`month_2025_${String(month).padStart(2, "0")}`] = splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, "ORDINARY") &&
        charge.periodYear === 2025 &&
        charge.periodMonth === month,
      (charge) => toPendingAmount(charge, inMemoryAllocationsByChargeId),
    );
  }

  console.log("Calculated cells for VQ#01A-010:");
  console.log(JSON.stringify(cells, null, 2));
}

main().catch(console.error);
