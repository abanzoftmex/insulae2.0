import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const modules = await prisma.moduleCatalog.findMany({
    select: {
      id: true,
      legacyId: true,
      name: true
    }
  });
  console.log("All modules in database:", modules);
}

main().catch(console.error).finally(() => prisma.$disconnect());
