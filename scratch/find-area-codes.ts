import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const areas = await prisma.privateArea.findMany({
    where: { condominiumId: condo.id, isActive: true },
    take: 15,
    select: { id: true, code: true, name: true },
  });

  console.log("Top 15 PrivateAreas in DB:");
  areas.forEach((a) => console.log(`- Name: "${a.name}" | Code: "${a.code}" | ID: ${a.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
