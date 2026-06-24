import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const sample = await prisma.privateArea.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      parentPrivateAreaId: true,
      m2Original: true,
      m2CommonArea: true,
      m2CommonAreaChildren: true,
      m2ConstructionCommonArea: true,
    },
    take: 10,
  });
  console.log("Sample Areas in INSULAE:", JSON.stringify(sample, null, 2));

  const parentsWithChildren = await prisma.privateArea.findMany({
    where: {
      isActive: true,
      parentPrivateAreaId: null,
      childPrivateAreas: { some: {} }
    },
    select: {
      id: true,
      name: true,
      m2CommonArea: true,
      m2CommonAreaChildren: true,
      m2ConstructionCommonArea: true,
      childPrivateAreas: {
        select: {
          id: true,
          name: true,
          m2CommonArea: true,
          m2CommonAreaChildren: true,
          m2ConstructionCommonArea: true,
        }
      }
    },
    take: 3,
  });
  console.log("Parents with children in INSULAE:", JSON.stringify(parentsWithChildren, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
