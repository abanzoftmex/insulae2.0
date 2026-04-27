import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const concepts = await prisma.budgetExpenseConcept.findMany({ 
    where: { year: 2025, name: { startsWith: "CONCEPTO" } },
    take: 5
  });
  console.log(concepts);
}
main().finally(() => prisma.$disconnect());
