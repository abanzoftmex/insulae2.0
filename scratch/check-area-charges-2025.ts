import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== CHECKING AREA CHARGES FOR 2025 ===");

  const charges2025 = await prisma.areaCharge.findMany({
    where: {
      condominiumId: condo.id,
      startsAt: {
        gte: new Date("2025-01-01T00:00:00.000Z"),
        lt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
    include: {
      chargeGroup: true,
      privateArea: true,
    },
  });

  console.log(`Total AreaCharges in 2025: ${charges2025.length}`);

  const sampleCodes = ["VQ#0P1", "VQ#01A", "VQ#01A-010", "VQ#01A-020"];
  const sampleAreas = await prisma.privateArea.findMany({
    where: {
      condominiumId: condo.id,
      code: { in: sampleCodes },
    },
    include: {
      areaCharges: {
        include: { chargeGroup: true },
      },
    },
  });

  console.log("\n=== SAMPLE AREAS FROM SCREENSHOT ===");
  sampleAreas.forEach((area) => {
    console.log(`\nArea: ${area.name} (Code: ${area.code}) | ID: ${area.id}`);
    console.log(`Total AreaCharges: ${area.areaCharges.length}`);
    area.areaCharges.forEach((c) => {
      console.log(`- startsAt: ${c.startsAt?.toISOString().slice(0, 10)} | endsAt: ${c.endsAt?.toISOString().slice(0, 10)} | Kind: ${c.chargeGroup.kind} | Amount: $${c.amount}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
