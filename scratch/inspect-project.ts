import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) {
    console.log("No active condo");
    return;
  }
  const projects = await prisma.project.findMany({
    where: { condominiumId: condo.id }
  });
  console.log("Condominium:", { id: condo.id, name: condo.name, slug: condo.slug });
  console.log("Projects:", JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
