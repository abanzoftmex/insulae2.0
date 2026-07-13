import { prisma } from "../src/shared/infrastructure/db/prisma";

function decimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const start = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));

  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condo.id,
      isActive: true,
      date: { gte: start, lt: end },
      miscCatalogId: { not: null },
    },
    select: {
      amount: true,
      miscCatalog: {
        select: {
          id: true,
          name: true,
          chargeGroup: {
            select: {
              name: true,
              kind: true,
            },
          },
        },
      },
    },
  });

  console.log("=== Incomes with miscCatalog for 2025 ===");
  const sumByCatalog = new Map<string, { sum: number; kind: string | null; name: string }>();

  for (const inc of incomes) {
    const catalog = inc.miscCatalog;
    if (!catalog) continue;
    const key = catalog.id;
    const amount = decimalToNumber(inc.amount);

    const existing = sumByCatalog.get(key) ?? { sum: 0, kind: catalog.chargeGroup?.kind ?? null, name: catalog.name };
    existing.sum += amount;
    sumByCatalog.set(key, existing);
  }

  for (const [id, val] of sumByCatalog) {
    console.log(`- Catalog: ${val.name} (${id}), Kind: ${val.kind}, Sum: ${val.sum}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
