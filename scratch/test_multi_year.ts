import { prisma } from "../src/shared/infrastructure/db/prisma";
import { getBudgetByYearUseCase } from "../src/modules/budget";

async function main() {
  try {
    const condo = await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    if (!condo) {
      console.log("No active condominium");
      return;
    }

    const years = [2024, 2025, 2026, 2027];
    for (const year of years) {
      console.log(`Testing year ${year}...`);
      try {
        const budget = await getBudgetByYearUseCase.execute(condo.id, year);
        console.log(`Year ${year}: success. Groups count: ${budget.groups.length}`);
      } catch (err: any) {
        console.error(`Year ${year} failed:`, err);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
