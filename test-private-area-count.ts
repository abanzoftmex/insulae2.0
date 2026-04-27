import { prisma } from "@/shared/infrastructure/db/prisma";
async function main() {
  const c1 = await prisma.privateArea.count({ where: { zone: "Centro", isActive: true, status: { not: "UNASSIGNED" } } });
  const c2 = await prisma.privateArea.count({ where: { zone: "Centro", isActive: true, status: { not: "UNASSIGNED" }, useType: { not: null } } });
  const c3 = await prisma.privateArea.count({ where: { zone: "Centro", isActive: true, status: { not: "UNASSIGNED" }, areaCharges: { some: { isActive: true } } } });
  console.log("Total:", c1, "With useType:", c2, "With AreaCharge:", c3);
}
main().finally(() => prisma.$disconnect());
