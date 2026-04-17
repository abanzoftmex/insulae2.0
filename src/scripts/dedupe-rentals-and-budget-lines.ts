import { prisma } from "@/shared/infrastructure/db/prisma";

type RentalGroupRow = {
  condominiumId: string;
  privateAreaId: string;
  tenantName: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  ids: string[];
};

type BudgetLineGroupRow = {
  budgetId: string;
  legacyId: number;
  ids: string[];
};

async function dedupeRentals(): Promise<{ groups: number; deleted: number }> {
  const groups = await prisma.$queryRaw<RentalGroupRow[]>`
    SELECT
      "condominiumId",
      "privateAreaId",
      "tenantName",
      "startsAt",
      "endsAt",
      ARRAY_AGG(id ORDER BY id) AS ids
    FROM "Rental"
    GROUP BY
      "condominiumId",
      "privateAreaId",
      "tenantName",
      "startsAt",
      "endsAt"
    HAVING COUNT(*) > 1
  `;

  let deleted = 0;

  for (const group of groups) {
    const [keeperId, ...duplicateIds] = group.ids;
    if (!keeperId || duplicateIds.length === 0) {
      continue;
    }

    for (const duplicateId of duplicateIds) {
      await prisma.$transaction([
        prisma.migrationIdMap.updateMany({
          where: {
            targetEntity: "Rental",
            targetId: duplicateId,
          },
          data: {
            targetId: keeperId,
          },
        }),
        prisma.rental.delete({
          where: { id: duplicateId },
        }),
      ]);
      deleted += 1;
    }
  }

  return { groups: groups.length, deleted };
}

async function dedupeBudgetLines(): Promise<{ groups: number; deleted: number; monthsMoved: number }> {
  const groups = await prisma.$queryRaw<BudgetLineGroupRow[]>`
    SELECT
      "budgetId",
      "legacyId",
      ARRAY_AGG(id ORDER BY id) AS ids
    FROM "BudgetLine"
    WHERE "legacyId" IS NOT NULL
    GROUP BY "budgetId", "legacyId"
    HAVING COUNT(*) > 1
  `;

  let deleted = 0;
  let monthsMoved = 0;

  for (const group of groups) {
    const [keeperId, ...duplicateIds] = group.ids;
    if (!keeperId || duplicateIds.length === 0) {
      continue;
    }

    for (const duplicateId of duplicateIds) {
      const months = await prisma.budgetMonth.findMany({
        where: { budgetLineId: duplicateId },
      });

      for (const month of months) {
        await prisma.budgetMonth.upsert({
          where: {
            budgetLineId_month: {
              budgetLineId: keeperId,
              month: month.month,
            },
          },
          create: {
            budgetLineId: keeperId,
            month: month.month,
            amount: month.amount,
          },
          update: {
            amount: month.amount,
          },
        });
        monthsMoved += 1;
      }

      await prisma.$transaction([
        prisma.budgetMonth.deleteMany({
          where: { budgetLineId: duplicateId },
        }),
        prisma.migrationIdMap.updateMany({
          where: {
            targetEntity: "BudgetLine",
            targetId: duplicateId,
          },
          data: {
            targetId: keeperId,
          },
        }),
        prisma.budgetLine.delete({
          where: { id: duplicateId },
        }),
      ]);

      deleted += 1;
    }
  }

  return { groups: groups.length, deleted, monthsMoved };
}

async function main(): Promise<void> {
  const rental = await dedupeRentals();
  const budgetLine = await dedupeBudgetLines();

  console.log(
    JSON.stringify(
      {
        rental,
        budgetLine,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
