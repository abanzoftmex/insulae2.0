import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const budget = await prisma.budget.findFirst({ where: { year: 2026 } });
    console.log("Budget 2026:", budget);

    const count = await prisma.budgetLine.count({
      where: { budget: { year: 2026 } }
    });
    console.log("Count of 2026 budget lines:", count);

    const lines = await prisma.budgetLine.findMany({
      where: { budget: { year: 2026 } },
      take: 10
    });
    console.log("Sample 2026 lines:", lines);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
