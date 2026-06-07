import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const groups = await prisma.budgetGroup.findMany({
    where: { year: 2025 },
    include: {
      concepts: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
    }
  });

  console.log("=== BUDGET GROUPS FOR year 2025 ===");
  for (const g of groups) {
    console.log(`\nGroup ID: ${g.id}`);
    console.log(`  Name: ${g.name}`);
    console.log(`  Category: ${g.category}`);
    console.log(`  IsActive: ${g.isActive}`);
    console.log(`  Concepts Count: ${g.concepts.length}`);
    for (const c of g.concepts) {
      console.log(`    Concept: ${c.name} | ID=${c.id} | Active=${c.isActive}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
