import { prisma } from "../src/shared/infrastructure/db/prisma";
import { getPrivateAreaListingUseCase } from "../src/modules/private-areas";

async function main() {
  const listing = await getPrivateAreaListingUseCase.execute({
    page: 1,
    pageSize: 10000,
    paginateByTopLevel: false,
  });

  if (!listing) {
    console.log("No listing found");
    return;
  }

  let totalAnnual2025 = 0;
  let totalMonthly2025 = 0;

  listing.rows.forEach((row) => {
    const annualCell = row.financialCells.ordinary_2025_annual;
    const monthlyCell = row.financialCells.ordinary_2025_monthly;

    if (annualCell) {
      totalAnnual2025 += (annualCell.owner || 0) + (annualCell.commerce || 0);
    }
    if (monthlyCell) {
      totalMonthly2025 += (monthlyCell.owner || 0) + (monthlyCell.commerce || 0);
    }
  });

  console.log("=== TOTAL CUOTAS ORDINARIAS 2025 ===");
  console.log(`Total Monthly (Suma mensual): $${totalMonthly2025.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
  console.log(`Total Annual (Suma anual): $${totalAnnual2025.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
