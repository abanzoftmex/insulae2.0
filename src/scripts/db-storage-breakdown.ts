import { prisma } from "@/shared/infrastructure/db/prisma";

type SizeRow = {
  table_name: string;
  total_size: string;
  total_bytes: bigint;
};

async function main(): Promise<void> {
  const rows = await prisma.$queryRaw<SizeRow[]>`
    SELECT
      relname AS table_name,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_total_relation_size(c.oid)::bigint AS total_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY total_bytes DESC
    LIMIT 25
  `;

  const formatted = rows.map((row) => ({
    table: row.table_name,
    size: row.total_size,
    bytes: Number(row.total_bytes),
  }));

  console.log(JSON.stringify(formatted, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
