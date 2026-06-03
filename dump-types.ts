import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const types = await prisma.announcementType.findMany();
  const subtypes = await prisma.announcementSubtype.findMany();
  console.dir({ types, subtypes }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
