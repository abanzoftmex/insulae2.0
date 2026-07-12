import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const count = await prisma.paymentAllocation.count();
  console.log("Total PaymentAllocation records in Neon:", count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
