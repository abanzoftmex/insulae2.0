import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const before = await prisma.legacyStagingRow.count();

  await prisma.$executeRawUnsafe('TRUNCATE TABLE "LegacyStagingRow"');

  const after = await prisma.legacyStagingRow.count();

  console.log(
    JSON.stringify(
      {
        table: "LegacyStagingRow",
        before,
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
