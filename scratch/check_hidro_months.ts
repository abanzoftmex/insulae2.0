import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // 2025 line months
    const line2025 = await prisma.budgetLine.findFirst({
      where: {
        budget: { year: 2025 },
        budgetConceptId: "f1ed1518-7092-4ba1-b250-8a85dcd43e9b"
      },
      include: { months: true }
    });
    console.log("2025 months data:", line2025?.months);

    // 2026 line months
    const line2026 = await prisma.budgetLine.findFirst({
      where: {
        budget: { year: 2026 },
        budgetConceptId: "59204778-2182-44c6-a19e-260a09e966ad"
      },
      include: { months: true }
    });
    console.log("2026 months data:", line2026?.months);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
