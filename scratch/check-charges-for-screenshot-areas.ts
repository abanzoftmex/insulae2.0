import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== INSPECTING CHARGES & AREA CHARGES FOR SCREENSHOT AREAS ===");

  const sampleNames = ["VQ#0P1", "VQ#01A", "VQ#01A-010", "VQ#01A-020", "VQ#224"];
  const areas = await prisma.privateArea.findMany({
    where: {
      condominiumId: condo.id,
      OR: sampleNames.map((n) => ({ name: { contains: n } })),
    },
    include: {
      charges: {
        include: { chargeGroup: true },
      },
      areaCharges: {
        where: { isActive: true },
        include: { chargeGroup: true },
      },
    },
  });

  areas.forEach((area) => {
    console.log(`\nArea Name: "${area.name}" | ID: ${area.id}`);
    console.log(`- Charges (model Charge) count: ${area.charges.length}`);
    console.log(`- AreaCharges (model AreaCharge) count: ${area.areaCharges.length}`);

    const charges2025 = area.charges.filter((c) => c.periodYear === 2025);
    console.log(`- Charges for 2025 count: ${charges2025.length}`);
    charges2025.forEach((c) => {
      console.log(`   Charge: Year ${c.periodYear} Month ${c.periodMonth} | Kind: ${c.chargeGroup.kind} | Resp: ${c.responsibility} | Amount: $${c.amount}`);
    });

    area.areaCharges.forEach((ac) => {
      console.log(`   AreaCharge template: startsAt ${ac.startsAt?.toISOString().slice(0, 10)} endsAt ${ac.endsAt?.toISOString().slice(0, 10)} | Kind: ${ac.chargeGroup.kind} | Amount: $${ac.amount}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
