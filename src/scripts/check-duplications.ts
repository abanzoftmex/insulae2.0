import { prisma } from "@/shared/infrastructure/db/prisma";

type DupRow = { duplicated_groups: number; duplicated_rows: number };

const checks: Array<{ name: string; sql: string }> = [
  {
    name: "User(condominiumId, legacyId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "legacyId", COUNT(*) AS cnt
        FROM "User"
        WHERE "legacyId" IS NOT NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "PrivateArea(condominiumId, legacyId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "legacyId", COUNT(*) AS cnt
        FROM "PrivateArea"
        WHERE "legacyId" IS NOT NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "ChargeGroup(condominiumId, legacyId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "legacyId", COUNT(*) AS cnt
        FROM "ChargeGroup"
        WHERE "legacyId" IS NOT NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "Charge(condominiumId, legacyId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "legacyId", COUNT(*) AS cnt
        FROM "Charge"
        WHERE "legacyId" IS NOT NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "Payment(condominiumId, legacyId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "legacyId", COUNT(*) AS cnt
        FROM "Payment"
        WHERE "legacyId" IS NOT NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "PaymentAllocation(paymentId, chargeId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "paymentId", "chargeId", COUNT(*) AS cnt
        FROM "PaymentAllocation"
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "AreaCharge(condominiumId, privateAreaId, chargeGroupId, startsAt)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "privateAreaId", "chargeGroupId", COALESCE("startsAt"::text, 'NULL') AS key_start, COUNT(*) AS cnt
        FROM "AreaCharge"
        GROUP BY 1,2,3,4
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "Rental(condominiumId, privateAreaId, startsAt, endsAt, tenantName)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "condominiumId", "privateAreaId",
               COALESCE("startsAt"::text, 'NULL') AS key_starts,
               COALESCE("endsAt"::text, 'NULL') AS key_ends,
               COALESCE("tenantName", 'NULL') AS key_tenant,
               COUNT(*) AS cnt
        FROM "Rental"
        GROUP BY 1,2,3,4,5
        HAVING COUNT(*) > 1
      ) t
    `,
  },
  {
    name: "BudgetLine(budgetId, legacyId)",
    sql: `
      SELECT COUNT(*)::int AS duplicated_groups,
             COALESCE(SUM(cnt - 1), 0)::int AS duplicated_rows
      FROM (
        SELECT "budgetId", "legacyId", COUNT(*) AS cnt
        FROM "BudgetLine"
        WHERE "legacyId" IS NOT NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
      ) t
    `,
  },
];

async function main(): Promise<void> {
  const results: Array<{ check: string; duplicated_groups: number; duplicated_rows: number }> = [];

  for (const check of checks) {
    const rows = await prisma.$queryRawUnsafe<DupRow[]>(check.sql);
    const row = rows[0] ?? { duplicated_groups: 0, duplicated_rows: 0 };
    results.push({ check: check.name, ...row });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
