import { prisma } from "./src/shared/infrastructure/db/prisma";
async function main() {
  const charges = await prisma.areaCharge.findMany({ take: 5, include: { chargeGroup: true, privateArea: { select: { name: true } } } });
  console.log("AreaCharge records:", JSON.stringify(charges, null, 2));
}
main().finally(() => prisma.$disconnect());
