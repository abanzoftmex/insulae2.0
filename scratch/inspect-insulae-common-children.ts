import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const children = await prisma.privateArea.findMany({
    where: {
      isActive: true,
      parentPrivateAreaId: { not: null },
      OR: [
        { name: { contains: "pasillo", mode: "insensitive" } },
        { name: { contains: "escalera", mode: "insensitive" } },
        { name: { contains: "comun", mode: "insensitive" } },
        { name: { contains: "bodega", mode: "insensitive" } },
        { name: { contains: "estacionamiento", mode: "insensitive" } },
      ]
    },
    select: {
      id: true,
      name: true,
      parentPrivateAreaId: true,
      m2Original: true,
      m2Apole: true,
      m2CommonArea: true,
      m2Construction: true,
      m2ConstructionCommonArea: true,
    },
  });

  console.log("Common area children found in Insulae:", children.length);
  if (children.length > 0) {
    console.log(JSON.stringify(children.slice(0, 10), null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
