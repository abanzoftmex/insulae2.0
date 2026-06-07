import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      legacyReceipt: { not: null }
    },
    select: {
      id: true,
      legacyId: true,
      legacyReceipt: true
    }
  });

  console.log(`Total expenses with legacyReceipt: ${expenses.length}`);
  
  const urlLike = expenses.filter(e => {
    const lr = e.legacyReceipt || "";
    return lr.startsWith("http") || lr.startsWith("/") || lr.includes(".pdf") || lr.includes(".jpg") || lr.includes(".png");
  });

  console.log(`Expenses with URL-like legacyReceipt: ${urlLike.length}`);
  for (const e of urlLike.slice(0, 10)) {
    console.log(`  ID=${e.id} | LegacyID=${e.legacyId} | legacyReceipt=${e.legacyReceipt}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
