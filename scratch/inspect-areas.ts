import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo");
    return;
  }

  // Find parents with m2CommonArea > 0
  const parentsWithCommon = await prisma.privateArea.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      parentPrivateAreaId: null,
      m2CommonArea: { gt: 0 }
    },
    select: {
      id: true,
      name: true,
      m2CommonArea: true,
      m2CommonAreaChildren: true,
      m2ConstructionCommonArea: true,
    },
    take: 5
  });

  // Find child areas with any of these columns > 0
  const childrenWithCommon = await prisma.privateArea.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      parentPrivateAreaId: { not: null },
      OR: [
        { m2CommonArea: { gt: 0 } },
        { m2CommonAreaChildren: { gt: 0 } },
        { m2ConstructionCommonArea: { gt: 0 } },
      ]
    },
    select: {
      id: true,
      name: true,
      parentPrivateAreaId: true,
      m2CommonArea: true,
      m2CommonAreaChildren: true,
      m2ConstructionCommonArea: true,
    },
    take: 5
  });

  console.log("Parents with m2CommonArea > 0 in Val'Quirico:", parentsWithCommon.length);
  console.log(JSON.stringify(parentsWithCommon, null, 2));
  console.log("Children with any common area > 0 in Val'Quirico:", childrenWithCommon.length);
  console.log(JSON.stringify(childrenWithCommon, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
