import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { toBudgetExpenseGroupFromLegacyGroupId } from "../src/shared/domain/budget-expense-group";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Map legacy groups from 2025 to 2026 legacy IDs
function get2026LegacyGroupId(legacyId: number): number {
  if (legacyId === 1 || legacyId === 19) return 19;
  if (legacyId === 2 || legacyId === 36) return 36;
  if (legacyId === 3 || legacyId === 20) return 20;
  if (legacyId === 4 || legacyId === 21) return 21;
  if (legacyId === 16 || legacyId === 33) return 33;
  if (legacyId >= 5 && legacyId <= 15) return legacyId + 17;
  if (legacyId === 17 || legacyId === 34) return 34;
  if (legacyId === 18 || legacyId === 35) return 35;
  return legacyId;
}

async function main() {
  try {
    const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condo) {
      console.log("No active condominium found.");
      return;
    }

    console.log(`Condominium: ${condo.name} (${condo.id})`);

    // Fetch all active budget groups in 2026
    const groups2026 = await prisma.budgetGroup.findMany({
      where: { condominiumId: condo.id, year: 2026, isActive: true },
    });

    console.log(`Found ${groups2026.length} active budget groups in 2026.`);
    const groupMapByLegacyId = new Map<number, string>(); // legacyId -> UUID
    for (const g of groups2026) {
      if (g.legacyId !== null) {
        groupMapByLegacyId.set(g.legacyId, g.id);
      }
    }

    // Fetch all active concepts in 2026
    const concepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, year: 2026, isActive: true },
    });

    console.log(`Found ${concepts.length} active concepts in 2026.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const concept of concepts) {
      // Find ExpenseConceptGroupMap for 2026
      let map = await prisma.expenseConceptGroupMap.findFirst({
        where: {
          condominiumId: condo.id,
          year: 2026,
          legacyBudgetConceptId: concept.legacyBudgetConceptId ?? -1,
        },
      });

      // Fallback to 2025 map if 2026 doesn't exist
      if (!map) {
        map = await prisma.expenseConceptGroupMap.findFirst({
          where: {
            condominiumId: condo.id,
            year: 2025,
            legacyBudgetConceptId: concept.legacyBudgetConceptId ?? -1,
          },
        });
      }

      if (!map) {
        console.log(`No mapping found for concept: ${concept.name} (legacyConceptId: ${concept.legacyBudgetConceptId})`);
        skippedCount++;
        continue;
      }

      const legacyGroupId = map.budgetGroupId;
      const targetLegacyGroupId = get2026LegacyGroupId(legacyGroupId);
      const targetGroupUuid = groupMapByLegacyId.get(targetLegacyGroupId);

      if (!targetGroupUuid) {
        console.log(`No target BudgetGroup UUID found for legacyGroupId: ${legacyGroupId} -> targetLegacyGroupId: ${targetLegacyGroupId} (Concept: ${concept.name})`);
        skippedCount++;
        continue;
      }

      const canonicalGroupString = toBudgetExpenseGroupFromLegacyGroupId(targetLegacyGroupId);

      // Perform update if different
      if (concept.budgetGroupId !== targetGroupUuid || concept.budgetGroup !== canonicalGroupString) {
        await prisma.budgetExpenseConcept.update({
          where: { id: concept.id },
          data: {
            budgetGroupId: targetGroupUuid,
            budgetGroup: canonicalGroupString,
          },
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`Updated concepts: ${updatedCount}`);
    console.log(`Skipped concepts (already mapped or no mapping): ${skippedCount}`);

  } catch (error) {
    console.error("Error during backfill:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
