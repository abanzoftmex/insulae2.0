import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyPagoRow = {
  activo?: unknown;
  id_areas_privativas?: unknown;
  id_cat_grupos_cobro?: unknown;
  id_cat_status_pago?: unknown;
  monto?: unknown;
  montoAbonado?: unknown;
  fechaPago?: unknown;
  anio?: unknown;
  mes?: unknown;
};

type LegacyAreaRow = {
  activo?: unknown;
  id_areas_privativas?: unknown;
};

type YearSeries = Record<number, number[]>;

type ValueMismatch = {
  rowId: string;
  year: number;
  month: number;
  expected: number;
  actual: number;
  diff: number;
};

type AnnualMismatch = {
  rowId: string;
  year: number;
  expected: number;
  actual: number;
  diff: number;
};

const TARGET_YEARS = [2024, 2025, 2026] as const;
const TOLERANCE = 0.005;
const EXTRAORDINARY_RECEIVABLE_ROWS = [
  { id: "extra-condo", legacyGroupId: 3 },
  { id: "extra-commerce", legacyGroupId: 6 },
] as const;

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

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

function parseNdjson<T>(content: string): T[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

function createZeroSeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function createYearSeries(): YearSeries {
  return Object.fromEntries(TARGET_YEARS.map((year) => [year, createZeroSeries()]));
}

function addAmountToSeries(series: number[], month: number, amount: number): void {
  const monthIndex = month - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return;
  }

  series[monthIndex] += amount;
}

function toRounded(value: number): number {
  return Number(value.toFixed(2));
}

function annualTotal(series: number[]): number {
  return series.reduce((acc, value) => acc + value, 0);
}

function sumSeries(seriesList: number[][]): number[] {
  const output = createZeroSeries();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    output[monthIndex] = seriesList.reduce((acc, series) => acc + (series[monthIndex] ?? 0), 0);
  }

  return output;
}

function isCanceledLegacyStatus(statusCode: number | null): boolean {
  return statusCode === 2 || statusCode === 4;
}

function normalizeMonth(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const parsed = Math.trunc(value);
  return parsed >= 1 && parsed <= 12 ? parsed : null;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const pagosPath = path.resolve(scriptDir, "../../data/legacy-export/PAGOS.ndjson");
  const areasPath = path.resolve(scriptDir, "../../data/legacy-export/AREAS_PRIVATIVAS.ndjson");

  const [pagosRaw, areasRaw] = await Promise.all([
    readFile(pagosPath, "utf8"),
    readFile(areasPath, "utf8"),
  ]);

  const pagos = parseNdjson<LegacyPagoRow>(pagosRaw);
  const areas = parseNdjson<LegacyAreaRow>(areasRaw);

  const activeAreaIds = new Set<number>(
    areas
      .filter((row) => asInt(row.activo) === 1)
      .map((row) => asInt(row.id_areas_privativas))
      .filter((value): value is number => value !== null),
  );

  const rowIdByLegacyGroupId = new Map<number, string>(
    EXTRAORDINARY_RECEIVABLE_ROWS.map((row) => [row.legacyGroupId, row.id]),
  );

  const expectedByRowId = new Map<string, YearSeries>(
    EXTRAORDINARY_RECEIVABLE_ROWS.map((row) => [row.id, createYearSeries()]),
  );

  for (const pago of pagos) {
    if (asInt(pago.activo) !== 1) {
      continue;
    }

    const areaId = asInt(pago.id_areas_privativas);
    if (areaId === null || !activeAreaIds.has(areaId)) {
      continue;
    }

    const rowId = rowIdByLegacyGroupId.get(asInt(pago.id_cat_grupos_cobro) ?? -1);
    if (!rowId) {
      continue;
    }

    const amount = asNumber(pago.monto) ?? 0;
    const paidAmount = asNumber(pago.montoAbonado) ?? 0;
    const outstanding = amount - paidAmount;
    if (outstanding <= 0) {
      continue;
    }

    const statusCode = asInt(pago.id_cat_status_pago);
    if (isCanceledLegacyStatus(statusCode)) {
      continue;
    }

    const paidAt = new Date(String(pago.fechaPago ?? ""));
    const fallbackYear = Number.isNaN(paidAt.getTime()) ? null : paidAt.getUTCFullYear();
    const fallbackMonth = Number.isNaN(paidAt.getTime()) ? null : paidAt.getUTCMonth() + 1;

    const periodYear = asInt(pago.anio) ?? fallbackYear;
    if (periodYear === null || !TARGET_YEARS.includes(periodYear as (typeof TARGET_YEARS)[number])) {
      continue;
    }

    const periodMonth = normalizeMonth(asInt(pago.mes)) ?? normalizeMonth(fallbackMonth);
    if (periodMonth === null) {
      continue;
    }

    const byYear = expectedByRowId.get(rowId);
    if (!byYear) {
      continue;
    }

    addAmountToSeries(byYear[periodYear], periodMonth, outstanding);
  }

  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No fue posible generar el resumen financiero para validar CxC extraordinaria");
  }

  const table = summary.extraordinaryReceivablesMultiYearTable;
  const runtimeRows = table.rows.filter((row) => !row.isTotal);
  const runtimeTotalRow = table.rows.find((row) => row.isTotal) ?? null;

  const runtimeRowById = new Map(
    runtimeRows.map((row) => [
      row.id,
      new Map(row.yearly.map((slice) => [slice.year, { months: [...slice.months], annualTotal: slice.annualTotal }])),
    ]),
  );

  const missingRuntimeRows = EXTRAORDINARY_RECEIVABLE_ROWS
    .map((row) => row.id)
    .filter((rowId) => !runtimeRowById.has(rowId));

  const unexpectedRuntimeRows = runtimeRows
    .map((row) => row.id)
    .filter((rowId) => !expectedByRowId.has(rowId));

  const valueMismatches: ValueMismatch[] = [];
  const annualMismatches: AnnualMismatch[] = [];

  for (const row of EXTRAORDINARY_RECEIVABLE_ROWS) {
    const expectedByYear = expectedByRowId.get(row.id);
    const runtimeByYear = runtimeRowById.get(row.id);

    if (!expectedByYear || !runtimeByYear) {
      continue;
    }

    for (const year of TARGET_YEARS) {
      const expectedMonths = expectedByYear[year] ?? createZeroSeries();
      const actualMonths = runtimeByYear.get(year)?.months ?? createZeroSeries();

      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedValue = expectedMonths[monthIndex] ?? 0;
        const actualValue = actualMonths[monthIndex] ?? 0;
        const diff = Math.abs(expectedValue - actualValue);

        if (diff > TOLERANCE) {
          valueMismatches.push({
            rowId: row.id,
            year,
            month: monthIndex + 1,
            expected: toRounded(expectedValue),
            actual: toRounded(actualValue),
            diff: toRounded(diff),
          });
        }
      }

      const expectedAnnual = annualTotal(expectedMonths);
      const actualAnnual = runtimeByYear.get(year)?.annualTotal ?? 0;
      const annualDiff = Math.abs(expectedAnnual - actualAnnual);

      if (annualDiff > TOLERANCE) {
        annualMismatches.push({
          rowId: row.id,
          year,
          expected: toRounded(expectedAnnual),
          actual: toRounded(actualAnnual),
          diff: toRounded(annualDiff),
        });
      }
    }
  }

  const expectedTotalByYear = new Map<number, number[]>(
    TARGET_YEARS.map((year) => [
      year,
      sumSeries(
        EXTRAORDINARY_RECEIVABLE_ROWS.map((row) => expectedByRowId.get(row.id)?.[year] ?? createZeroSeries()),
      ),
    ]),
  );

  const totalMismatches: ValueMismatch[] = [];
  const totalAnnualMismatches: AnnualMismatch[] = [];

  if (runtimeTotalRow) {
    const runtimeTotalByYear = new Map(
      runtimeTotalRow.yearly.map((slice) => [slice.year, { months: [...slice.months], annualTotal: slice.annualTotal }]),
    );

    for (const year of TARGET_YEARS) {
      const expectedMonths = expectedTotalByYear.get(year) ?? createZeroSeries();
      const actualMonths = runtimeTotalByYear.get(year)?.months ?? createZeroSeries();

      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedValue = expectedMonths[monthIndex] ?? 0;
        const actualValue = actualMonths[monthIndex] ?? 0;
        const diff = Math.abs(expectedValue - actualValue);

        if (diff > TOLERANCE) {
          totalMismatches.push({
            rowId: "extraordinary-receivables-total",
            year,
            month: monthIndex + 1,
            expected: toRounded(expectedValue),
            actual: toRounded(actualValue),
            diff: toRounded(diff),
          });
        }
      }

      const expectedAnnual = annualTotal(expectedMonths);
      const actualAnnual = runtimeTotalByYear.get(year)?.annualTotal ?? 0;
      const annualDiff = Math.abs(expectedAnnual - actualAnnual);

      if (annualDiff > TOLERANCE) {
        totalAnnualMismatches.push({
          rowId: "extraordinary-receivables-total",
          year,
          expected: toRounded(expectedAnnual),
          actual: toRounded(actualAnnual),
          diff: toRounded(annualDiff),
        });
      }
    }
  }

  const totals = TARGET_YEARS.map((year) => ({
    year,
    expectedAnnual: toRounded(annualTotal(expectedTotalByYear.get(year) ?? createZeroSeries())),
    runtimeAnnual: toRounded(
      runtimeTotalRow?.yearly.find((slice) => slice.year === year)?.annualTotal ?? 0,
    ),
  }));

  const result = {
    tableId: table.id,
    tableTitle: table.title,
    years: [...TARGET_YEARS],
    missingRuntimeRows,
    unexpectedRuntimeRows,
    valueMismatchCount: valueMismatches.length,
    annualMismatchCount: annualMismatches.length,
    totalMismatchCount: totalMismatches.length,
    totalAnnualMismatchCount: totalAnnualMismatches.length,
    sampleValueMismatches: valueMismatches.slice(0, 40),
    sampleAnnualMismatches: annualMismatches.slice(0, 20),
    sampleTotalMismatches: totalMismatches.slice(0, 40),
    sampleTotalAnnualMismatches: totalAnnualMismatches.slice(0, 20),
    totals,
    parityOk:
      missingRuntimeRows.length === 0 &&
      unexpectedRuntimeRows.length === 0 &&
      valueMismatches.length === 0 &&
      annualMismatches.length === 0 &&
      totalMismatches.length === 0 &&
      totalAnnualMismatches.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
