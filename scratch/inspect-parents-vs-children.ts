import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo found");
    return;
  }

  const allAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id, isActive: true }
  });

  const parents = allAreas.filter(a => a.parentPrivateAreaId === null);
  const children = allAreas.filter(a => a.parentPrivateAreaId !== null);

  const parentsWithCommon = parents.filter(p => p.m2CommonArea && Number(p.m2CommonArea) > 0);
  const childrenWithCommon = children.filter(c => c.m2CommonArea && Number(c.m2CommonArea) > 0);

  const parentCommonSum = parentsWithCommon.reduce((acc, p) => acc + Number(p.m2CommonArea), 0);
  const childCommonSum = childrenWithCommon.reduce((acc, c) => acc + Number(c.m2CommonArea), 0);

  console.log("Val'Quirico Area Summary:");
  console.log("Total active parents:", parents.length);
  console.log("Parents with m2CommonArea > 0:", parentsWithCommon.length);
  console.log("Sum of parents' m2CommonArea:", parentCommonSum);
  console.log("Total active children:", children.length);
  console.log("Children with m2CommonArea > 0:", childrenWithCommon.length);
  console.log("Sum of children's m2CommonArea:", childCommonSum);
}

main().catch(console.error).finally(() => prisma.$disconnect());
