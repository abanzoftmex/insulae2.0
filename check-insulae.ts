import { prisma } from './src/shared/infrastructure/db/prisma';

async function main() {
  const groups = await prisma.budgetGroup.findMany({
    select: { id: true, name: true, year: true, isActive: true, category: true }
  });

  const byYear = groups.reduce((acc, g) => {
    acc[g.year] = (acc[g.year] || 0) + 1;
    return acc;
  }, {} as any);

  console.log("Groups by year in Insulae:", byYear);
}

main()
  .catch(e => console.error(e));
