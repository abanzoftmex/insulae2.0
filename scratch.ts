import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const charges = await prisma.areaCharge.findMany({ take: 5, include: { chargeGroup: true, privateArea: { select: { name: true } } } });
  console.log(charges);
}
main().catch(console.error).finally(() => prisma.$disconnect());
