import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const allAreas = await prisma.privateArea.findMany({
    where: { condominiumId: "0b15da02-5c8e-4a65-8b83-a4e2ba15db4c" }, // Wait, get active condo
  });

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo");
    return;
  }

  const reportableAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id, isActive: true }
  });

  const parentAreas = reportableAreas.filter(
    (area) =>
      !area.isFusion &&
      (area.parentPrivateAreaId === null ||
        (area.parentPrivateAreaId && !area.name.includes("-")))
  );

  console.log("Total parentAreas:", parentAreas.length);
  const m2CommonAreaGt0 = parentAreas.filter(p => p.m2CommonArea && Number(p.m2CommonArea) > 0);
  console.log("Parent areas with m2CommonArea > 0:", m2CommonAreaGt0.length);

  const sample = m2CommonAreaGt0.slice(0, 5).map(p => ({
    id: p.id,
    name: p.name,
    m2Original: p.m2Original,
    m2Apole: p.m2Apole,
    m2CommonArea: p.m2CommonArea,
    parentPrivateAreaId: p.parentPrivateAreaId,
  }));
  console.log("Sample parents with m2CommonArea > 0:", JSON.stringify(sample, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
