import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const groups = await prisma.budgetGroup.findMany({
      where: { year: 2026 },
    });
    console.log("All 2026 Budget Groups:");
    console.log(JSON.stringify(groups, null, 2));

    const concepts = await prisma.budgetExpenseConcept.findMany({
      where: { name: "Proyecto Hidrosanitario, Proyecto Eléctrico Integral", year: 2026 },
      include: { group: true }
    });
    console.log("\nConcepts matching 'Proyecto Hidrosanitario, Proyecto Eléctrico Integral' in 2026:");
    console.log(JSON.stringify(concepts, null, 2));

    const concepts2025 = await prisma.budgetExpenseConcept.findMany({
      where: { name: "Proyecto Hidrosanitario, Proyecto Eléctrico Integral", year: 2025 },
      include: { group: true }
    });
    console.log("\nConcepts matching 'Proyecto Hidrosanitario, Proyecto Eléctrico Integral' in 2025:");
    console.log(JSON.stringify(concepts2025, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
