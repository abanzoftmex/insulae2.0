import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const areaId = "81aa6f9f-1939-4685-91e1-51f84e7d3d84";
  const area = await prisma.privateArea.findUnique({
    where: { id: areaId },
    include: {
      incomes: {
        include: {
          chargeGroup: true
        }
      }
    }
  });

  console.log("=== INCOMES IN DB ===");
  console.log("Total incomes:", area?.incomes.length);
  area?.incomes.sort((a,b) => a.date.getTime() - b.date.getTime()).forEach(inc => {
    console.log(`- Date=${inc.date.toISOString().slice(0, 10)}, Amount=${inc.amount}, LegacyId=${inc.legacyId}, Group=${inc.chargeGroup?.name}, GroupKind=${inc.chargeGroup?.kind}`);
  });
}

main().catch(console.error);
