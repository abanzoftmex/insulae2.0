import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== INSPECTING CHARGES FOR SPECIFIC AREAS ===");

  const sampleCodes = ["VQ#0P1", "VQ#01A", "VQ#01A-010", "VQ#01A-020", "VQ#224", "VQ#081-010", "VQ#538"];
  const areas = await prisma.privateArea.findMany({
    where: {
      condominiumId: condo.id,
      code: { in: sampleCodes },
    },
    include: {
      areaCharges: {
        where: { isActive: true },
        include: { chargeGroup: true },
      },
    },
  });

  areas.forEach((area) => {
    console.log(`\nArea Code: "${area.code}" | Name: "${area.name}" | ID: ${area.id} | HierarchyRole: ${area.hierarchyRole}`);
    console.log(`Total active AreaCharges: ${area.areaCharges.length}`);

    // Group charges by startsAt year and kind
    const byYearKind: Record<string, number> = {};
    area.areaCharges.forEach((c) => {
      const yr = c.startsAt ? c.startsAt.getUTCFullYear() : "NULL";
      const key = `${yr}_${c.chargeGroup.kind}`;
      byYearKind[key] = (byYearKind[key] || 0) + Number(c.amount);
    });
    console.log("Charges summary (Year_Kind => Sum):", byYearKind);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
