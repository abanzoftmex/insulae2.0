import { prisma } from "../src/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "../src/config/project-scope";

function decimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

async function main() {
  // Replicate exact repository logic
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        isActive: true,
        slug: PROJECT_SCOPE.condominiumCode,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, slug: true },
    }));

  if (!condominium) {
    console.log("No condominium found");
    return;
  }

  console.log("Condominium:", condominium.name, "(slug:", condominium.slug + ")");

  const privateAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condominium.id },
    select: {
      id: true,
      name: true,
      isActive: true,
      isFusion: true,
      m2CommonArea: true,
      m2ConstructionCommonArea: true,
      parentPrivateAreaId: true,
      parentPrivateArea: {
        select: { isFusion: true },
      },
    },
  });

  console.log("Total private areas fetched:", privateAreas.length);

  const reportableAreas = privateAreas.filter((area) => area.isActive);
  console.log("Reportable (isActive) areas:", reportableAreas.length);

  // Exact parentAreas filter from repository
  const parentAreas = reportableAreas.filter(
    (area) =>
      !area.isFusion &&
      (area.parentPrivateAreaId === null ||
        (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
  );

  console.log("parentAreas count (exact repo filter):", parentAreas.length);
  console.log(
    "parentAreas with m2CommonArea > 0:",
    parentAreas.filter((a) => decimalToNumber(a.m2CommonArea) > 0).length
  );

  // Build childAreasByParentId (exact repo logic)
  const childAreasByParentId = new Map<string, typeof privateAreas>();
  for (const area of reportableAreas) {
    if (area.parentPrivateAreaId) {
      const list = childAreasByParentId.get(area.parentPrivateAreaId) ?? [];
      list.push(area);
      childAreasByParentId.set(area.parentPrivateAreaId, list);
    }
  }

  // Step 1: sum children.m2ConstructionCommonArea
  let parentAreasCommonM2 = parentAreas.reduce((acc, parentArea) => {
    const children = childAreasByParentId.get(parentArea.id) ?? [];
    const childrenCommonAreaChildrenM2 = children.reduce(
      (sum, child) => sum + decimalToNumber(child.m2ConstructionCommonArea),
      0
    );
    return acc + childrenCommonAreaChildrenM2;
  }, 0);

  console.log("\n--- Step 1: sum children.m2ConstructionCommonArea ---");
  console.log("parentAreasCommonM2 after step 1:", parentAreasCommonM2);

  // Step 2: fallback to parent.m2CommonArea
  if (parentAreasCommonM2 === 0) {
    parentAreasCommonM2 = parentAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2CommonArea),
      0
    );
    console.log("\n--- Step 2: fallback to parent.m2CommonArea ---");
    console.log("parentAreasCommonM2 after fallback:", parentAreasCommonM2);
  } else {
    console.log("No fallback needed.");
  }

  // Show a few samples of parentAreas
  console.log("\n--- Sample of parentAreas (first 5) ---");
  for (const area of parentAreas.slice(0, 5)) {
    console.log({
      name: area.name,
      parentPrivateAreaId: area.parentPrivateAreaId,
      isFusion: area.isFusion,
      parentIsFusion: area.parentPrivateArea?.isFusion,
      m2CommonArea: decimalToNumber(area.m2CommonArea),
      m2ConstructionCommonArea: decimalToNumber(area.m2ConstructionCommonArea),
    });
  }

  // Sample areas with parentPrivateAreaId not null that pass the parent filter
  const pseudoParents = parentAreas.filter((a) => a.parentPrivateAreaId !== null);
  console.log("\nparentAreas that have a parentPrivateAreaId (pseudo-parents):", pseudoParents.length);
  if (pseudoParents.length > 0) {
    for (const area of pseudoParents.slice(0, 5)) {
      console.log({
        name: area.name,
        parentPrivateAreaId: area.parentPrivateAreaId,
        parentIsFusion: area.parentPrivateArea?.isFusion,
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
