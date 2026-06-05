const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const areas = await prisma.privateArea.findMany({ where: { isActive: true, status: { in: ['AVAILABLE', 'SOLD', 'RENTED'] } } });
  let sum = 0;
  for (const a of areas) {
    sum += Number(a.indiviso || 0);
  }
  console.log('Sum:', sum);
}
main().finally(() => {
  prisma.$disconnect();
});
