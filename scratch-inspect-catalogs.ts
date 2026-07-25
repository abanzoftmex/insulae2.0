import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const catalogs = await prisma.miscIncomeCatalog.findMany({
    where: { chargeGroup: { kind: "ORDINARY" } },
    include: { chargeGroup: true }
  });

  console.log("=== MISC INCOME CATALOGS ===");
  catalogs.forEach(cat => {
    console.log(`- ID=${cat.id}, Name=${cat.name}, IsActive=${cat.isActive}, Start=${cat.quotaPeriodStart?.toISOString()}, End=${cat.quotaPeriodEnd?.toISOString()}`);
  });
}

main().catch(console.error);
