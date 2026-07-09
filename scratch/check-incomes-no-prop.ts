const { prisma } = require("../src/shared/infrastructure/db/prisma");

async function main() {
  const incomesNoProp = await prisma.income.findMany({
    where: {
      privateAreaId: null,
      isActive: true
    },
    include: {
      chargeGroup: true,
      miscCatalog: true
    }
  });
  console.log(`Found ${incomesNoProp.length} active incomes with no property:`);
  for (const inc of incomesNoProp.slice(0, 10)) {
    console.log(`- Date: ${inc.date.toISOString().split('T')[0]}, Concept: ${inc.concept}, Amount: ${inc.amount}, miscCatalogId: ${inc.miscCatalogId}, chargeGroupId: ${inc.chargeGroupId}`);
  }
}

main().catch(console.error);
