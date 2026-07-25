import { prisma } from "./src/shared/infrastructure/db/prisma";

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
      incomes: true,
      areaCharges: {
        include: {
          chargeGroup: true
        }
      }
    }
  });

  console.log("=== AREA ===");
  console.log("Name:", area?.name);
  console.log("Code:", area?.code);
  console.log("Status:", area?.status);
  console.log("IsActive:", area?.isActive);

  console.log("\n=== AREA CHARGES (Configured monthly fees) ===");
  area?.areaCharges.forEach(ac => {
    console.log(`- ${ac.chargeGroup.name} (${ac.chargeGroup.kind}): Amount=${ac.amount}, startsAt=${ac.startsAt?.toISOString()}`);
  });

  console.log("\n=== CHARGES (Generated monthly bills) ===");
  console.log("Total charges:", area?.charges.length);
  const ordCharges = area?.charges.filter(c => c.chargeGroup.name.includes("Ordinaria") || c.chargeGroup.chargeType === "ORDINARY");
  console.log("Ordinary charges sample (first 10):");
  ordCharges?.slice(0, 15).forEach(c => {
    console.log(`- Year=${c.periodYear}, Month=${c.periodMonth}, Responsibility=${c.responsibility}, Amount=${c.amount}, PaidAmount=${c.paidAmount}, Collectible=${c.isCollectible}, Group=${c.chargeGroup.name}`);
  });

  console.log("\n=== INCOMES (Recorded manual payments) ===");
  console.log("Total incomes:", area?.incomes.length);
  area?.incomes.slice(0, 15).forEach(inc => {
    console.log(`- Date=${inc.date.toISOString().slice(0, 10)}, Amount=${inc.amount}, LegacyId=${inc.legacyId}`);
  });
}

main().catch(console.error);
