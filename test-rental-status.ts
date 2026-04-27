import { prisma } from "@/shared/infrastructure/db/prisma";
async function main() {
  const statuses = await prisma.rental.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  console.log(statuses);
}
main().finally(() => prisma.$disconnect());
