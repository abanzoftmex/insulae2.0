import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condos = await prisma.condominium.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true
    }
  });
  console.log("Condominiums:", condos);
}

main().catch(console.error).finally(() => prisma.$disconnect());
