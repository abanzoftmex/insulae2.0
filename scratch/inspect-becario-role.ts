import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const roles = await prisma.role.findMany({
    where: {
      name: "Becario"
    },
    select: {
      id: true,
      name: true,
      condominiumId: true,
      isActive: true,
      condominium: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  console.log("Roles named 'Becario':", roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
