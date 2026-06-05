import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const groups = await prisma.budgetGroup.findMany({ where: { year: 2025 }, orderBy: { order: 'asc' }});
  groups.forEach(g => console.log(g.order, g.name, g.category));
}
main().finally(() => prisma.$disconnect());
