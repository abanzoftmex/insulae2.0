import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const condominium = await prisma.condominium.findFirst({ where: { isActive: true } });
  
  await prisma.sanctionCatalog.create({
    data: {
      condominiumId: condominium.id,
      legacyId: 1,
      name: "tirar basura",
      article: null,
      isActive: true,
    }
  });

  await prisma.sanctionCatalog.create({
    data: {
      condominiumId: condominium.id,
      legacyId: 2,
      name: "exceso de ruido",
      article: "xxx",
      isActive: true,
    }
  });

  console.log("Seeded sanctions!");
}

main().finally(() => prisma.$disconnect());
