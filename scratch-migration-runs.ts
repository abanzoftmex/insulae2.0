import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const runs = await prisma.migrationRun.findMany({
    orderBy: { createdAt: "desc" }
  });
  console.log("Migration Runs:");
  console.log(runs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
