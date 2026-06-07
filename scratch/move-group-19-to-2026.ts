import { prisma } from '../src/shared/infrastructure/db/prisma';

async function main() {
  const groupId = '5fb79470-28c6-4b91-9426-e92fa72a43c7';

  // 1. Verify group exists and is currently in 2025
  const group = await prisma.budgetGroup.findUnique({
    where: { id: groupId }
  });

  if (!group) {
    throw new Error(`BudgetGroup with ID ${groupId} not found.`);
  }

  console.log(`Current Group State: Name="${group.name}", Year=${group.year}, LegacyId=${group.legacyId}`);

  if (group.year === 2026) {
    console.log("Group is already in year 2026. No changes needed.");
    return;
  }

  // 2. Perform the update in a transaction
  console.log("Updating Group and its Concepts to year 2026...");
  await prisma.$transaction([
    prisma.budgetGroup.update({
      where: { id: groupId },
      data: { year: 2026 }
    }),
    prisma.budgetExpenseConcept.updateMany({
      where: { budgetGroupId: groupId },
      data: { year: 2026 }
    })
  ]);

  console.log("Update completed successfully!");

  // 3. Verify final state
  const updatedGroup = await prisma.budgetGroup.findUnique({
    where: { id: groupId }
  });
  const updatedConceptsCount = await prisma.budgetExpenseConcept.count({
    where: { budgetGroupId: groupId, year: 2026 }
  });

  console.log(`Updated Group State: Name="${updatedGroup?.name}", Year=${updatedGroup?.year}, Concepts in 2026 Count=${updatedConceptsCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
