import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const budgets = await prisma.budget.findMany({
    include: {
      _count: {
        select: { lines: true }
      }
    }
  });

  console.log("All budgets:", JSON.stringify(budgets, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
