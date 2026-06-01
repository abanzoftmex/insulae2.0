import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const area862 = await prisma.privateArea.findFirst({
    where: { legacyId: 862 },
    select: { id: true, name: true, legacyId: true, isFusion: true }
  });
  console.log("Area 862 (fusion in legacy):", area862);

  const mismatches = [800, 801, 802, 803, 804];
  const mismatchAreas = await prisma.privateArea.findMany({
    where: { legacyId: { in: mismatches } },
    select: { id: true, name: true, legacyId: true, isFusion: true }
  });
  console.log("Mismatch areas in Neon:", mismatchAreas);

  await prisma.$disconnect();
}

main();
