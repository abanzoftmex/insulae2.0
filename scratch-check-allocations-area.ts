import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const area = await prisma.privateArea.findFirst({
    where: { name: "VQ#115-130" }
  });
  if (!area) return;

  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      charge: { privateAreaId: area.id }
    },
    include: {
      charge: true,
      payment: true
    }
  });

  console.log("Allocations count for VQ#115-130:", allocations.length);
  console.log("Allocations:", allocations.map(a => ({
    id: a.id,
    amount: a.amount.toString(),
    chargeId: a.chargeId,
    chargePeriod: `${a.charge.periodYear}-${a.charge.periodMonth}`,
    paymentId: a.paymentId,
    paymentAmount: a.payment.amount.toString()
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
