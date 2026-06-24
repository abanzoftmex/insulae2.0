import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const parents = await prisma.privateArea.findMany({
    where: {
      isActive: true,
      parentPrivateAreaId: null,
      childPrivateAreas: { some: {} },
    },
    include: {
      childPrivateAreas: true,
    },
  });

  console.log("Total parent areas with children:", parents.length);

  for (const parent of parents.slice(0, 5)) {
    console.log(`Parent: ${parent.name}`);
    console.log(`  m2Original: ${parent.m2Original}`);
    console.log(`  m2CommonArea: ${parent.m2CommonArea}`);
    console.log(`  m2ConstructionCommonArea: ${parent.m2ConstructionCommonArea}`);
    console.log(`  Number of children: ${parent.childPrivateAreas.length}`);
    const childrenSample = parent.childPrivateAreas.slice(0, 3).map(c => ({
      name: c.name,
      m2Original: c.m2Original,
      m2CommonArea: c.m2CommonArea,
      m2ConstructionCommonArea: c.m2ConstructionCommonArea,
    }));
    console.log(`  Sample children:`, JSON.stringify(childrenSample, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
