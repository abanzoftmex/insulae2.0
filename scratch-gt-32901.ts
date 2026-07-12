import { prisma } from "./src/shared/infrastructure/db/prisma";

async function main() {
  const count = await prisma.charge.count({
    where: {
      legacyId: { gt: 32901 }
    }
  });
  console.log("Neon charges with legacyId > 32901:", count);

  const samples = await prisma.charge.findMany({
    where: {
      legacyId: { gt: 32901 }
    },
    take: 5,
    select: {
      id: true,
      legacyId: true,
      createdAt: true,
      concept: true,
      amount: true,
      periodYear: true,
      periodMonth: true
    }
  });
  console.log("Samples:", samples);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
