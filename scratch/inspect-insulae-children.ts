import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const children = await prisma.privateArea.findMany({
    where: {
      isActive: true,
      parentPrivateAreaId: { not: null },
    },
    select: {
      id: true,
      name: true,
      parentPrivateAreaId: true,
      m2Original: true,
      m2Apole: true,
      m2CommonArea: true,
      m2ConstructionCommonArea: true,
      m2CommonAreaChildren: true,
    },
  });

  console.log("Total children in Insulae:", children.length);

  const m2CommonAreaGt0 = children.filter(c => c.m2CommonArea && Number(c.m2CommonArea) > 0);
  const m2ConstructionCommonAreaGt0 = children.filter(c => c.m2ConstructionCommonArea && Number(c.m2ConstructionCommonArea) > 0);
  const m2CommonAreaChildrenGt0 = children.filter(c => c.m2CommonAreaChildren && Number(c.m2CommonAreaChildren) > 0);

  console.log("Children with m2CommonArea > 0:", m2CommonAreaGt0.length);
  console.log("Children with m2ConstructionCommonArea > 0:", m2ConstructionCommonAreaGt0.length);
  console.log("Children with m2CommonAreaChildren > 0:", m2CommonAreaChildrenGt0.length);

  if (m2CommonAreaGt0.length > 0) {
    console.log("Sample children with m2CommonArea > 0:", JSON.stringify(m2CommonAreaGt0.slice(0, 5), null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
