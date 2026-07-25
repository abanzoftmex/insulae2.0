import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== INSPECTING ALL AREA CHARGES BY YEAR ===");

  const allCharges = await prisma.areaCharge.findMany({
    where: { condominiumId: condo.id, isActive: true },
    include: { chargeGroup: true },
  });

  console.log(`Total active AreaCharges: ${allCharges.length}`);

  const byYearKind: Record<string, number> = {};
  const byYearCount: Record<string, number> = {};

  allCharges.forEach((c) => {
    const yr = c.startsAt ? c.startsAt.getUTCFullYear() : "NULL";
    const k = `${yr}_${c.chargeGroup.kind}`;
    byYearKind[k] = (byYearKind[k] || 0) + Number(c.amount);
    const yrStr = String(yr);
    byYearCount[yrStr] = (byYearCount[yrStr] || 0) + 1;
  });

  console.log("AreaCharges count by year:", byYearCount);
  console.log("AreaCharges sum by Year & Kind:", byYearKind);
}

main().catch(console.error).finally(() => prisma.$disconnect());
