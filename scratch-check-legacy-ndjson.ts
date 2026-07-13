import { readFile } from "node:fs/promises";
import path from "node:path";

type LegacyIncome = {
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_dcat_varios?: unknown;
  id_cat_grupos_cobro?: unknown;
};

async function readNdjsonRows<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

async function main() {
  const incomesFilePath = "/Users/gabrielhernandez/projects/valquirico/insuale2.0/data/legacy-export/INGRESOS.ndjson";
  
  const legacyIncomeRows = await readNdjsonRows<LegacyIncome>(incomesFilePath);
  
  console.log("=== CHECKING LEGACY INCOME FILE ===");
  console.log("Total legacy incomes:", legacyIncomeRows.length);

  const parsed = legacyIncomeRows.map(row => {
    const dateStr = typeof row.fecha === "string" ? row.fecha : "";
    const date = new Date(dateStr);
    return {
      date,
      amount: Number(row.monto ?? 0),
      isActive: Number(row.activo) === 1,
      miscCatalogId: row.id_dcat_varios ? Number(row.id_dcat_varios) : null
    };
  }).filter(r => r.isActive && !Number.isNaN(r.date.getTime()));

  const counts2025 = Array.from({ length: 12 }, () => 0);
  const sums2025 = Array.from({ length: 12 }, () => 0);
  const catalogedCounts2025 = Array.from({ length: 12 }, () => 0);
  const catalogedSums2025 = Array.from({ length: 12 }, () => 0);

  for (const r of parsed) {
    if (r.date.getUTCFullYear() === 2025) {
      const month = r.date.getUTCMonth();
      counts2025[month] += 1;
      sums2025[month] += r.amount;
      if (r.miscCatalogId !== null && r.miscCatalogId !== 0) {
        catalogedCounts2025[month] += 1;
        catalogedSums2025[month] += r.amount;
      }
    }
  }

  console.log("\n2025 Monthly Stats in Legacy File:");
  for (let m = 0; m < 12; m++) {
    console.log(`Month ${m + 1}:`);
    console.log(`  Total: ${counts2025[m]} rows, sum = $${sums2025[m].toLocaleString()}`);
    console.log(`  Cataloged: ${catalogedCounts2025[m]} rows, sum = $${catalogedSums2025[m].toLocaleString()}`);
  }
}

main().catch(console.error);
