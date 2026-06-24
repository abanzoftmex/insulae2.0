import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const activeCommon = await prisma.privateArea.findMany({
    where: {
      isActive: true,
      m2CommonArea: { not: null, gt: 0 }
    },
    select: {
      id: true,
      name: true,
      parentPrivateAreaId: true,
      m2Original: true,
      m2CommonArea: true,
      m2CommonAreaChildren: true,
      m2ConstructionCommonArea: true,
    },
    take: 30,
  });

  console.log("Active Common Areas in INSULAE with m2CommonArea:", JSON.stringify(activeCommon, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
