import { prisma } from "../src/shared/infrastructure/db/prisma";

function decimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function main() {
  const privateAreas = await prisma.privateArea.findMany({
    where: { condominiumId: "0b15da02-5c8e-4a65-8b83-a4e2ba15db4c" }, // Wait, let's find the active condominium id first
  });

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo found");
    return;
  }

  const allAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id }
  });

  const reportableAreas = allAreas.filter(a => a.isActive);
  const parentAreas = reportableAreas.filter(
    (area) =>
      !area.isFusion &&
      (area.parentPrivateAreaId === null ||
        (area.parentPrivateAreaId && !area.name.includes("-"))) // Simplified hierarchy checks
  );

  // Old formula
  const parentAreasCommonM2_old = parentAreas.reduce(
    (acc, area) => acc + decimalToNumber(area.m2CommonArea),
    0
  );

  // New formula (SASSI-like child.m2ConstructionCommonArea)
  const childAreasByParentId = new Map<string, any[]>();
  for (const area of reportableAreas) {
    if (area.parentPrivateAreaId) {
      const list = childAreasByParentId.get(area.parentPrivateAreaId) ?? [];
      list.push(area);
      childAreasByParentId.set(area.parentPrivateAreaId, list);
    }
  }

  const parentAreasCommonM2_new = parentAreas.reduce((acc, parentArea) => {
    const children = childAreasByParentId.get(parentArea.id) ?? [];
    const childrenCommonAreaChildrenM2 = children.reduce(
      (sum, child) => sum + decimalToNumber(child.m2ConstructionCommonArea),
      0
    );
    return acc + childrenCommonAreaChildrenM2;
  }, 0);

  // What about child.m2CommonArea?
  const parentAreasCommonM2_childCommonArea = parentAreas.reduce((acc, parentArea) => {
    const children = childAreasByParentId.get(parentArea.id) ?? [];
    const childrenCommonM2 = children.reduce(
      (sum, child) => sum + decimalToNumber(child.m2CommonArea),
      0
    );
    return acc + childrenCommonM2;
  }, 0);

  // What about child.m2CommonAreaChildren?
  const parentAreasCommonM2_childCommonAreaChildren = parentAreas.reduce((acc, parentArea) => {
    const children = childAreasByParentId.get(parentArea.id) ?? [];
    const childrenCommonAreaChildrenM2 = children.reduce(
      (sum, child) => sum + decimalToNumber(child.m2CommonAreaChildren),
      0
    );
    return acc + childrenCommonAreaChildrenM2;
  }, 0);

  console.log("Condo name:", condo.name);
  console.log("parentAreas count:", parentAreas.length);
  console.log("parentAreasCommonM2 (old parent.m2CommonArea):", parentAreasCommonM2_old);
  console.log("parentAreasCommonM2 (new child.m2ConstructionCommonArea):", parentAreasCommonM2_new);
  console.log("parentAreasCommonM2 (child.m2CommonArea):", parentAreasCommonM2_childCommonArea);
  console.log("parentAreasCommonM2 (child.m2CommonAreaChildren):", parentAreasCommonM2_childCommonAreaChildren);
}

main().catch(console.error).finally(() => prisma.$disconnect());
