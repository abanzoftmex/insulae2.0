import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const m2CommonAreaCount = await prisma.privateArea.count({
    where: { m2CommonArea: { not: null, gt: 0 } }
  });
  const m2CommonAreaChildrenCount = await prisma.privateArea.count({
    where: { m2CommonAreaChildren: { not: null, gt: 0 } }
  });
  const m2ConstructionCommonAreaCount = await prisma.privateArea.count({
    where: { m2ConstructionCommonArea: { not: null, gt: 0 } }
  });

  console.log("Counts in INSULAE:");
  console.log("m2CommonArea count:", m2CommonAreaCount);
  console.log("m2CommonAreaChildren count:", m2CommonAreaChildrenCount);
  console.log("m2ConstructionCommonArea count:", m2ConstructionCommonAreaCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
