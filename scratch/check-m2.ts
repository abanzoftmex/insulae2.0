import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true }
  });

  if (!condominium) {
    console.log("No active condominium found.");
    return;
  }

  console.log(`Active Condominium: ${condominium.name} (${condominium.id})`);

  const stats = await prisma.privateArea.aggregate({
    where: { condominiumId: condominium.id, isActive: true },
    _sum: {
      m2Original: true,
      m2Apole: true,
      m2Construction: true,
      m2CommonArea: true,
    },
    _count: {
      id: true,
    }
  });

  console.log("Stats for active private areas:");
  console.log(`Count: ${stats._count.id}`);
  console.log(`m2Original (Original): ${stats._sum.m2Original?.toNumber()}`);
  console.log(`m2Apole (Apole): ${stats._sum.m2Apole?.toNumber()}`);
  console.log(`m2Construction (Construction): ${stats._sum.m2Construction?.toNumber()}`);
  console.log(`m2CommonArea (Common): ${stats._sum.m2CommonArea?.toNumber()}`);
}

main().catch(console.error);
