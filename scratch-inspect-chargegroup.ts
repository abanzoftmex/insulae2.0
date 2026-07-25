import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const areaId = "81aa6f9f-1939-4685-91e1-51f84e7d3d84";
  const area = await prisma.privateArea.findUnique({
    where: { id: areaId },
    include: {
      charges: {
        include: {
          chargeGroup: true
        }
      },
      incomes: {
        include: {
          chargeGroup: true
        }
      }
    }
  });

  console.log("=== CHARGES ===");
  area?.charges.slice(0, 15).forEach(c => {
    console.log(`- Year=${c.periodYear}, Month=${c.periodMonth}, ChargeGroupId=${c.chargeGroupId}, GroupKind=${c.chargeGroup.kind}`);
  });

  console.log("\n=== INCOMES ===");
  area?.incomes.slice(0, 15).forEach(inc => {
    console.log(`- Date=${inc.date.toISOString().slice(0, 10)}, Amount=${inc.amount}, ChargeGroupId=${inc.chargeGroupId}, GroupKind=${inc.chargeGroup?.kind}`);
  });
}

main().catch(console.error);
