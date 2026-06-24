import { prisma } from "../src/shared/infrastructure/db/prisma";

function decimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo");
    return;
  }

  const reportableAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id, isActive: true },
    include: {
      parentPrivateArea: true
    }
  });

  const parentAreas = reportableAreas.filter(
    (area) =>
      !area.isFusion &&
      (area.parentPrivateAreaId === null ||
        (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
  );

  const childAreasByParentId = new Map<string, any[]>();
  for (const area of reportableAreas) {
    if (area.parentPrivateAreaId) {
      const list = childAreasByParentId.get(area.parentPrivateAreaId) ?? [];
      list.push(area);
      childAreasByParentId.set(area.parentPrivateAreaId, list);
    }
  }

  const parentAreasCommonM2_unified = parentAreas.reduce((acc, parentArea) => {
    const children = childAreasByParentId.get(parentArea.id) ?? [];
    const childrenCommonAreaChildrenM2 = children.reduce(
      (sum, child) => sum + decimalToNumber(child.m2ConstructionCommonArea),
      0
    );
    
    if (childrenCommonAreaChildrenM2 > 0) {
      return acc + childrenCommonAreaChildrenM2;
    }
    return acc + decimalToNumber(parentArea.m2CommonArea);
  }, 0);

  console.log("Condominium:", condo.name);
  console.log("Result with unified fallback formula:", parentAreasCommonM2_unified);
}

main().catch(console.error).finally(() => prisma.$disconnect());
