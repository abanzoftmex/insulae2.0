import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condo) return;

    // Group 2026 concepts by source, isActive and whether budgetGroupId is null
    const summary = await prisma.budgetExpenseConcept.groupBy({
      by: ["source", "isActive"],
      where: { condominiumId: condo.id, year: 2026 },
      _count: { id: true }
    });

    console.log("Summary of 2026 concepts:");
    for (const s of summary) {
      // Get count of null vs non-null budgetGroupId for this combination
      const countNull = await prisma.budgetExpenseConcept.count({
        where: { condominiumId: condo.id, year: 2026, source: s.source, isActive: s.isActive, budgetGroupId: null }
      });
      const countNonNull = await prisma.budgetExpenseConcept.count({
        where: { condominiumId: condo.id, year: 2026, source: s.source, isActive: s.isActive, budgetGroupId: { not: null } }
      });
      console.log(`Source: ${s.source}, IsActive: ${s.isActive} -> budgetGroupId IS NULL: ${countNull}, budgetGroupId NOT NULL: ${countNonNull}`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
