import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const catalogs = await prisma.miscIncomeCatalog.findMany({
    where: { isActive: true },
    include: {
      chargeGroup: true,
    },
    orderBy: { order: "asc" },
  });

  console.log("Found active MiscIncomeCatalog count:", catalogs.length);
  catalogs.forEach((c) => {
    console.log(`- ID: ${c.id} | Name: "${c.name}" | chargeGroupId: ${c.chargeGroupId} | kind: ${c.chargeGroup?.kind} | legacyChargeGroupId: ${c.legacyChargeGroupId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
