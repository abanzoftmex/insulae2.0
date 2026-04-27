import { prisma } from "@/shared/infrastructure/db/prisma";
async function main() {
  const counts = await prisma.privateArea.groupBy({
    by: ['status'],
    where: { zone: "Centro", isActive: true, useType: { not: null } },
    _count: { id: true },
  });
  console.log("Counts:", counts);
}
main().finally(() => prisma.$disconnect());
