import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const before = await prisma.$queryRaw<Array<{ duplicated_pairs: number }>>`
    SELECT COUNT(*)::int AS duplicated_pairs
    FROM (
      SELECT "paymentId", "chargeId"
      FROM "PaymentAllocation"
      GROUP BY "paymentId", "chargeId"
      HAVING COUNT(*) > 1
    ) t
  `;

  const deleted = await prisma.$executeRaw`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY "paymentId", "chargeId"
               ORDER BY "createdAt" DESC, id DESC
             ) AS rn
      FROM "PaymentAllocation"
    )
    DELETE FROM "PaymentAllocation" p
    USING ranked r
    WHERE p.id = r.id
      AND r.rn > 1
  `;

  const after = await prisma.$queryRaw<Array<{ duplicated_pairs: number }>>`
    SELECT COUNT(*)::int AS duplicated_pairs
    FROM (
      SELECT "paymentId", "chargeId"
      FROM "PaymentAllocation"
      GROUP BY "paymentId", "chargeId"
      HAVING COUNT(*) > 1
    ) t
  `;

  console.log(
    JSON.stringify(
      {
        before: before[0]?.duplicated_pairs ?? 0,
        deleted,
        after: after[0]?.duplicated_pairs ?? 0,
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
