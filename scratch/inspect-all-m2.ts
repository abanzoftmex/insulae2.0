import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo");
    return;
  }

  const allAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id, isActive: true }
  });

  const fields = [
    "m2Original",
    "m2Apole",
    "m2Construction",
    "m2CommonArea",
    "m2ConstructionChildren",
    "m2CommonAreaChildren",
    "m2ConstructionCommonArea",
    "indiviso",
    "vccc"
  ];

  console.log(`Summary of all m2 fields for ${condo.name}:`);
  for (const field of fields) {
    const populated = allAreas.filter(a => (a as any)[field] && Number((a as any)[field]) > 0);
    const sum = populated.reduce((acc, a) => acc + Number((a as any)[field]), 0);
    console.log(`- ${field}: populated count = ${populated.length}, sum = ${sum}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
