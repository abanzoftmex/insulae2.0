const { prisma } = require("../src/shared/infrastructure/db/prisma");

async function main() {
  const incomes = await prisma.income.findMany({
    where: {
      miscCatalogId: {
        in: [
          '0b541376-cb96-4191-8e27-49e449869072', // Hoteles
          '1ef961a1-71dc-46bd-8a84-e206b5a17d7c'  // Comercios
        ]
      },
      isActive: true
    },
    include: {
      privateArea: true
    }
  });
  console.log(`Found ${incomes.length} active incomes for FORMA 8/6-1:`);
  for (const inc of incomes) {
    console.log(`- Date: ${inc.date.toISOString().split('T')[0]}, Concept: ${inc.concept}, Amount: ${inc.amount}, miscCatalogId: ${inc.miscCatalogId}, privateAreaId: ${inc.privateAreaId}`);
  }
}

main().catch(console.error);
