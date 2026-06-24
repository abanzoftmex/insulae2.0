import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const parents = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id, parentPrivateAreaId: null, isActive: true },
    select: {
      id: true,
      name: true,
      m2CommonArea: true,
      childPrivateAreas: { select: { id: true } }
    }
  });

  const withChildren = parents.filter(p => p.childPrivateAreas.length > 0);
  const withoutChildren = parents.filter(p => p.childPrivateAreas.length === 0);

  console.log("Val'Quirico parents with children:", withChildren.length);
  for (const p of withChildren.slice(0, 10)) {
    console.log(`  Name: ${p.name}, m2CommonArea: ${p.m2CommonArea}, Children: ${p.childPrivateAreas.length}`);
  }

  console.log("Val'Quirico parents without children:", withoutChildren.length);
  const withoutChildrenWithCommon = withoutChildren.filter(p => p.m2CommonArea && Number(p.m2CommonArea) > 0);
  console.log("Val'Quirico parents without children with m2CommonArea > 0:", withoutChildrenWithCommon.length);
  for (const p of withoutChildrenWithCommon.slice(0, 10)) {
    console.log(`  Name: ${p.name}, m2CommonArea: ${p.m2CommonArea}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
