import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const parents = await prisma.privateArea.findMany({
    where: {
      isActive: true,
      parentPrivateAreaId: null,
      name: { in: ["VQ#119", "VQ#252", "VQ#263"] },
    },
    include: {
      childPrivateAreas: true,
    },
  });

  for (const parent of parents) {
    console.log(`Parent: ${parent.name}`);
    console.log(`  m2Original: ${parent.m2Original}`);
    console.log(`  m2CommonArea: ${parent.m2CommonArea}`);
    console.log(`  Number of children: ${parent.childPrivateAreas.length}`);
    if (parent.childPrivateAreas.length > 0) {
      console.log(`  Children names:`, parent.childPrivateAreas.map(c => c.name));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
