import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  console.log("=== TESTING ORDINARY 2025 MONTHLY RESOLUTION ===");

  const sampleNames = ["VQ#0P1", "VQ#01A", "VQ#01A-010", "VQ#01A-020", "VQ#01A-110", "VQ#224"];
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

  const year2025Start = new Date("2025-01-01T00:00:00.000Z");
  const year2025End = new Date("2025-12-31T23:59:59.999Z");

  areas.forEach((area) => {
    console.log(`\nArea: "${area.name}" (ID: ${area.id})`);

    // 1. Existing logic (strict startsAt year === 2025)
    const oldCharge2025 = area.areaCharges.find((ac) => {
      return ac.chargeGroup.kind === "ORDINARY" && ac.startsAt?.getUTCFullYear() === 2025;
    });
    console.log(`Old logic amount2025: $${oldCharge2025 ? oldCharge2025.amount : 0}`);

    // 2. Improved logic: Check range OR active ORDINARY areaCharge OR monthly Charge model
    const newAreaCharge2025 = area.areaCharges.find((ac) => {
      if (ac.chargeGroup.kind !== "ORDINARY") return false;
      const startOk = !ac.startsAt || ac.startsAt <= year2025End;
      const endOk = !ac.endsAt || ac.endsAt >= year2025Start;
      return startOk && endOk;
    }) || area.areaCharges.find((ac) => ac.chargeGroup.kind === "ORDINARY");

    let newAmount2025 = newAreaCharge2025 ? Number(newAreaCharge2025.amount) : 0;

    // Fallback: If areaCharge amount is 0 or null, check monthly Charge model for 2025
    if (newAmount2025 === 0) {
      const monthlyCharges2025 = area.charges.filter(
        (c) => c.chargeGroup.kind === "ORDINARY" && c.periodYear === 2025
      );
      if (monthlyCharges2025.length > 0) {
        const sum = monthlyCharges2025.reduce((acc, c) => acc + Number(c.amount), 0);
        newAmount2025 = sum / monthlyCharges2025.length; // average or monthly amount
      }
    }

    console.log(`NEW logic amount2025: $${newAmount2025}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
