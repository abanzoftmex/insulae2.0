import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const parents = await prisma.privateArea.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      parentPrivateAreaId: null,
      name: { contains: "comun", mode: "insensitive" }
    }
  });

  console.log("Val'Quirico parents with 'comun' in name:", parents.length);
  for (const p of parents) {
    console.log(`- ${p.name}: m2CommonArea = ${p.m2CommonArea}, m2ConstructionCommonArea = ${p.m2ConstructionCommonArea}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
