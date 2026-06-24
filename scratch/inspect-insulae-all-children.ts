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
      m2Construction: true,
      m2ConstructionCommonArea: true,
    },
  });

  console.log("Total children:", children.length);
  console.log("Children with m2Original > 0:", children.filter(c => c.m2Original && Number(c.m2Original) > 0).length);
  console.log("Children with m2Original = 0:", children.filter(c => c.m2Original !== null && Number(c.m2Original) === 0).length);
  console.log("Children with m2Original is null:", children.filter(c => c.m2Original === null).length);

  console.log("Children with m2Apole > 0:", children.filter(c => c.m2Apole && Number(c.m2Apole) > 0).length);
  console.log("Children with m2Apole = 0:", children.filter(c => c.m2Apole !== null && Number(c.m2Apole) === 0).length);
  console.log("Children with m2Apole is null:", children.filter(c => c.m2Apole === null).length);

  console.log("Children with m2Construction > 0:", children.filter(c => c.m2Construction && Number(c.m2Construction) > 0).length);
  
  // Show a few children that have m2Original = 0 or null
  const sampleZero = children.filter(c => c.m2Original === null || Number(c.m2Original) === 0);
  console.log("Sample children with m2Original 0 or null:", JSON.stringify(sampleZero.slice(0, 5), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
