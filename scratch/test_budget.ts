import { prisma } from "../src/shared/infrastructure/db/prisma";
import { getBudgetByYearUseCase, getBudgetStructureUseCase } from "../src/modules/budget";

async function main() {
  try {
    console.log("Fetching active condominium...");
    const condo = await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    console.log("Active condominium:", condo);

    if (!condo) {
      console.log("No active condominium found!");
      return;
    }

    const currentYear = new Date().getUTCFullYear();
    console.log(`Testing getBudgetByYearUseCase for year ${currentYear}...`);
    const budget = await getBudgetByYearUseCase.execute(condo.id, currentYear);
    console.log("Budget fetched successfully. Groups count:", budget.groups.length);

    console.log(`Testing getBudgetStructureUseCase for year ${currentYear}...`);
    const structure = await getBudgetStructureUseCase.execute(condo.id, currentYear);
    console.log("Structure fetched successfully. Groups count:", structure.groups.length);

  } catch (error) {
    console.error("Error executing budget queries:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
