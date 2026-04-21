import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getFinancialSummaryUseCase } from "@/modules/financial-summary";

type LegacyMiscIncomeCatalog = {
  id_dcat_varios?: unknown;
  nombre?: unknown;
  activo?: unknown;
  id_cat_grupos_cobro?: unknown;
};

type LegacyIncome = {
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_dcat_varios?: unknown;
  id_cat_grupos_cobro?: unknown;
};

type YearMonthSeries = Record<number, number[]>;

type ValueMismatch = {
  label: string;
  year: number;
  month: number;
  expected: number;
  actual: number;
  diff: number;
};

const YEARS = [2024, 2025, 2026] as const;
const TOLERANCE = 0.005;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInt(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createSeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function createYearSeries(): YearMonthSeries {
  return Object.fromEntries(YEARS.map((year) => [year, createSeries()]));
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function readNdjsonRows<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const miscCatalogFilePath = path.resolve(scriptDir, "../../data/legacy-export/DCAT_VARIOS.ndjson");
  const incomesFilePath = path.resolve(scriptDir, "../../data/legacy-export/INGRESOS.ndjson");

  const [legacyCatalogRows, legacyIncomeRows] = await Promise.all([
    readNdjsonRows<LegacyMiscIncomeCatalog>(miscCatalogFilePath),
    readNdjsonRows<LegacyIncome>(incomesFilePath),
  ]);

  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No fue posible generar el resumen financiero");
  }

  const table = summary.extraordinaryOtherIncomeMultiYearTable;
  const runtimeRows = table.rows.filter((row) => !row.isTotal);
  const runtimeTotalRow = table.rows.find((row) => row.isTotal);

  const runtimeByNormalizedLabel = new Map<
    string,
    {
      id: string;
      label: string;
      byYear: Map<number, number[]>;
    }
  >();

  for (const row of runtimeRows) {
    runtimeByNormalizedLabel.set(normalizeLabel(row.label), {
      id: row.id,
      label: row.label,
      byYear: new Map(row.yearly.map((slice) => [slice.year, [...slice.months]])),
    });
  }

  const expectedByNormalizedLabel = new Map<string, YearMonthSeries>();
  const expectedLabelByNormalizedLabel = new Map<string, string>();
  const catalogByLegacyId = new Map<number, string>();

  for (const row of legacyCatalogRows) {
    const legacyId = asInt(row.id_dcat_varios);
    if (legacyId === null || asInt(row.activo) !== 1) {
      continue;
    }

    const legacyChargeGroupId = asInt(row.id_cat_grupos_cobro);
    if (legacyChargeGroupId !== 3 && legacyChargeGroupId !== 6) {
      continue;
    }

    const label = asString(row.nombre) ?? `Vario ${legacyId}`;
    const normalized = normalizeLabel(label);

    expectedByNormalizedLabel.set(normalized, createYearSeries());
    expectedLabelByNormalizedLabel.set(normalized, label);
    catalogByLegacyId.set(legacyId, normalized);
  }

  for (const row of legacyIncomeRows) {
    if (asInt(row.activo) !== 1) {
      continue;
    }

    const legacyMiscCatalogId = asInt(row.id_dcat_varios);
    if (legacyMiscCatalogId === null) {
      continue;
    }

    const normalized = catalogByLegacyId.get(legacyMiscCatalogId);
    if (!normalized) {
      continue;
    }

    const legacyChargeGroupId = asInt(row.id_cat_grupos_cobro);
    if (legacyChargeGroupId !== null && legacyChargeGroupId !== 0) {
      continue;
    }

    const dateRaw = typeof row.fecha === "string" ? row.fecha : null;
    if (!dateRaw) {
      continue;
    }

    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const year = date.getUTCFullYear();
    if (!YEARS.includes(year as (typeof YEARS)[number])) {
      continue;
    }

    const monthIndex = date.getUTCMonth();
    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    const amount = asNumber(row.monto) ?? 0;
    const series = expectedByNormalizedLabel.get(normalized);
    if (!series) {
      continue;
    }

    series[year][monthIndex] += amount;
  }

  const expectedKeys = Array.from(expectedByNormalizedLabel.keys()).sort();
  const actualKeys = Array.from(runtimeByNormalizedLabel.keys()).sort();

  const missingRows = expectedKeys
    .filter((key) => !runtimeByNormalizedLabel.has(key))
    .map((key) => expectedLabelByNormalizedLabel.get(key) ?? key);

  const unexpectedRows = actualKeys
    .filter((key) => !expectedByNormalizedLabel.has(key))
    .map((key) => runtimeByNormalizedLabel.get(key)?.label ?? key);

  const valueMismatches: ValueMismatch[] = [];

  for (const key of expectedKeys) {
    const expected = expectedByNormalizedLabel.get(key);
    const runtime = runtimeByNormalizedLabel.get(key);

    if (!expected || !runtime) {
      continue;
    }

    for (const year of YEARS) {
      const runtimeMonths = runtime.byYear.get(year) ?? createSeries();
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedValue = expected[year][monthIndex] ?? 0;
        const actualValue = runtimeMonths[monthIndex] ?? 0;
        const diff = Math.abs(expectedValue - actualValue);

        if (diff > TOLERANCE) {
          valueMismatches.push({
            label: runtime.label,
            year,
            month: monthIndex + 1,
            expected: Number(expectedValue.toFixed(2)),
            actual: Number(actualValue.toFixed(2)),
            diff: Number(diff.toFixed(2)),
          });
        }
      }
    }
  }

  const totalMismatches: Array<Omit<ValueMismatch, "label">> = [];
  if (runtimeTotalRow) {
    const runtimeTotalByYear = new Map<number, number[]>(
      runtimeTotalRow.yearly.map((slice) => [slice.year, [...slice.months]]),
    );

    for (const year of YEARS) {
      const expectedMonths = Array.from({ length: 12 }, (_, monthIndex) =>
        expectedKeys.reduce(
          (acc, key) => acc + (expectedByNormalizedLabel.get(key)?.[year][monthIndex] ?? 0),
          0,
        ),
      );
      const actualMonths = runtimeTotalByYear.get(year) ?? createSeries();

      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedValue = expectedMonths[monthIndex] ?? 0;
        const actualValue = actualMonths[monthIndex] ?? 0;
        const diff = Math.abs(expectedValue - actualValue);

        if (diff > TOLERANCE) {
          totalMismatches.push({
            year,
            month: monthIndex + 1,
            expected: Number(expectedValue.toFixed(2)),
            actual: Number(actualValue.toFixed(2)),
            diff: Number(diff.toFixed(2)),
          });
        }
      }
    }
  }

  const result = {
    tableId: table.id,
    tableTitle: table.title,
    years: table.years,
    expectedRowCount: expectedKeys.length,
    actualRowCount: actualKeys.length,
    missingRows,
    unexpectedRows,
    valueMismatchCount: valueMismatches.length,
    totalMismatchCount: totalMismatches.length,
    sampleValueMismatches: valueMismatches.slice(0, 20),
    sampleTotalMismatches: totalMismatches.slice(0, 20),
    parityOk:
      missingRows.length === 0 &&
      unexpectedRows.length === 0 &&
      valueMismatches.length === 0 &&
      totalMismatches.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
