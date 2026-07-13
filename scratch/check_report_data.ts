import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!condominium) {
    console.error("No active condominium found.");
    return;
  }

  console.log(`Active Condominium: ${condominium.name} (${condominium.slug})`);

  const privateAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condominium.id },
    select: {
      id: true,
      name: true,
      isActive: true,
      isFusion: true,
      parentPrivateAreaId: true,
      parentPrivateArea: {
        select: {
          isFusion: true,
        },
      },
    },
  });

  console.log(`Total registered private areas: ${privateAreas.length}`);

  const activeAreas = privateAreas.filter(a => a.isActive);
  console.log(`Active private areas (isActive: true): ${activeAreas.length}`);

  // Criteria for parent areas
  const parentAreas = activeAreas.filter(
    (area) =>
      !area.isFusion &&
      (area.parentPrivateAreaId === null ||
        (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
  );
  console.log(`Active parents: ${parentAreas.length}`);

  // Criteria for child areas
  const childAreas = activeAreas.filter(
    (area) =>
      !area.isFusion &&
      area.parentPrivateAreaId !== null &&
      (area.parentPrivateArea?.isFusion === false || area.name.includes("-"))
  );
  console.log(`Active children (FAPs): ${childAreas.length}`);

  // Let's print some child areas
  console.log("\nSome active children:");
  for (const child of childAreas.slice(0, 10)) {
    const parent = privateAreas.find(p => p.id === child.parentPrivateAreaId);
    console.log(`- Child: ${child.name} (parent: ${parent?.name}, parent isFusion: ${parent?.isFusion})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
