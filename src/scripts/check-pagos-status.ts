import { prisma } from "@/shared/infrastructure/db/prisma";

async function main() {
  const result = await prisma.$queryRaw<
    Array<{ legacyTable: string; status: string; cnt: bigint }>
  >`
    SELECT 
      "legacyTable",
      CASE 
        WHEN "promotedAt" IS NOT NULL THEN 'PROMOTED'
        WHEN "promotionError" IS NOT NULL THEN 'ERROR'
        ELSE 'PENDING'
      END as status,
      COUNT(*) as cnt
    FROM "LegacyStagingRow"
    WHERE "runId" = '7f45439d-ac46-45a4-a5dd-fdf7ef45b9d6'
    AND "legacyTable" = 'PAGOS'
    GROUP BY "legacyTable", status
    ORDER BY cnt DESC
  `;
  const formatted = result.map((r) => ({
    ...r,
    cnt: r.cnt.toString(),
  }));
  console.log(JSON.stringify(formatted, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
