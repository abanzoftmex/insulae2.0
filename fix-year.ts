import { prisma } from './src/shared/infrastructure/db/prisma';

async function main() {
  const groupsIn2027 = await prisma.budgetGroup.findMany({
    where: { year: 2027 },
    include: { concepts: true }
  });

  if (groupsIn2027.length > 0) {
    console.log(`Found ${groupsIn2027.length} groups in 2027. Reverting to 2025.`);
    for (const group of groupsIn2027) {
      await prisma.budgetGroup.update({
        where: { id: group.id },
        data: { year: 2025 }
      });
      await prisma.budgetExpenseConcept.updateMany({
        where: { budgetGroupId: group.id },
        data: { year: 2025 }
      });
    }
    console.log("Reverted successfully!");
  } else {
    console.log("No groups found in 2027.");
  }
}

main()
  .catch(e => console.error(e));
