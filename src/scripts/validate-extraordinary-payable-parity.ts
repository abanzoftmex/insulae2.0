import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyExpenseRow = {
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_cat_conceptos_presupuesto?: unknown;
};

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

function createZeroSeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function sumSeries(seriesList: number[][]): number[] {
  const output = createZeroSeries();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    output[monthIndex] = seriesList.reduce((acc, series) => acc + (series[monthIndex] ?? 0), 0);
  }

  return output;
}

function cumulativeSeries(series: number[]): number[] {
  const output = createZeroSeries();
  let running = 0;

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    running += series[monthIndex] ?? 0;
    output[monthIndex] = running;
  }

  return output;
}

function annualPeriodTotal(series: number[]): number {
  return series[11] ?? 0;
}

function toRounded(value: number): number {
  return Number(value.toFixed(2));
}

async function readNdjsonRows<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

function parseConceptIdFromRowId(rowId: string): number | null {
  const match = /^extraordinary-expense-concept-(\d+)$/.exec(rowId);
  if (!match) {
    return null;
  }

  const conceptId = Number.parseInt(match[1], 10);
  return Number.isFinite(conceptId) ? conceptId : null;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));

  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: { id: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true },
    }));

  if (!condominium) {
    throw new Error("No se encontro condominio activo para validar cuentas por pagar extraordinarias");
  }

  const extraordinaryConcepts = await prisma.budgetExpenseConcept.findMany({
    where: {
      condominiumId: condominium.id,
      year: { in: [...TARGET_YEARS] },
      budgetGroup: "EXTRAORDINARY",
      isActive: true,
      legacyBudgetConceptId: { not: null },
    },
    select: {
      year: true,
      legacyBudgetConceptId: true,
    },
  });

  const extraordinaryConceptKeys = new Set<string>(
    extraordinaryConcepts
      .filter(
        (row): row is { year: number; legacyBudgetConceptId: number } =>
          row.legacyBudgetConceptId !== null,
      )
      .map((row) => `${row.year}:${row.legacyBudgetConceptId}`),
  );

  const expectedConceptIds = [...new Set(
    extraordinaryConcepts
      .map((row) => row.legacyBudgetConceptId)
      .filter((value): value is number => value !== null),
  )].sort((left, right) => left - right);

  if (extraordinaryConceptKeys.size === 0) {
    throw new Error(
      "No hay mapeo canonico en budget_expense_concept para grupo EXTRAORDINARY. Ejecuta ETL/backfill antes de validar paridad.",
    );
  }

  const expenseRows = await readNdjsonRows<LegacyExpenseRow>(
    path.resolve(scriptDir, "../../data/legacy-export/GASTOS.ndjson"),
  );

  const expectedExpenseByConceptIdByYear = new Map<number, Record<number, number[]>>();
  const ignoredExpenseConceptKeys = new Set<string>();

  for (const row of expenseRows) {
    if (asInt(row.activo) !== 1) {
      continue;
    }

    const conceptId = asInt(row.id_cat_conceptos_presupuesto);
    if (conceptId === null) {
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
    if (!TARGET_YEARS.includes(year as (typeof TARGET_YEARS)[number])) {
      continue;
    }

    const conceptKey = `${year}:${conceptId}`;
    if (!extraordinaryConceptKeys.has(conceptKey)) {
      ignoredExpenseConceptKeys.add(conceptKey);
      continue;
    }

    if (!expectedExpenseByConceptIdByYear.has(conceptId)) {
      expectedExpenseByConceptIdByYear.set(
        conceptId,
        Object.fromEntries(TARGET_YEARS.map((targetYear) => [targetYear, createZeroSeries()])),
      );
    }

    const month = date.getUTCMonth();
    const amount = asNumber(row.monto) ?? 0;
    expectedExpenseByConceptIdByYear.get(conceptId)![year][month] += amount;
  }

  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No fue posible generar el resumen financiero en runtime");
  }

  const table = summary.extraordinaryPayablesMultiYearTable;
  const runtimeRows = table.rows.filter((tableRow) => !tableRow.isTotal);
  const runtimeTotalRow = table.rows.find((tableRow) => tableRow.isTotal) ?? null;

  const expectedRowIds = expectedConceptIds.map(
    (conceptId) => `extraordinary-expense-concept-${conceptId}`,
  );
  const runtimeRowIds = runtimeRows.map((row) => row.id);

  const missingRuntimeRows = expectedRowIds.filter((rowId) => !runtimeRowIds.includes(rowId));
  const unexpectedRuntimeRows = runtimeRowIds.filter((rowId) => !expectedRowIds.includes(rowId));

  const valueMismatches: ValueMismatch[] = [];
  const annualMismatches: AnnualMismatch[] = [];

  const expectedPayableByRowIdByYear = new Map<string, Record<number, number[]>>();

  for (const row of runtimeRows) {
    const conceptId = parseConceptIdFromRowId(row.id);
    if (conceptId === null) {
      continue;
    }

    const expectedExpenseByYear =
      expectedExpenseByConceptIdByYear.get(conceptId) ??
      Object.fromEntries(TARGET_YEARS.map((year) => [year, createZeroSeries()]));

    const expectedPayableByYear = Object.fromEntries(
      TARGET_YEARS.map((year) => [
        year,
        cumulativeSeries((expectedExpenseByYear[year] ?? createZeroSeries()).map((value) => -value)),
      ]),
    ) as Record<number, number[]>;

    expectedPayableByRowIdByYear.set(row.id, expectedPayableByYear);

    const runtimeByYear = new Map(
      row.yearly.map((slice) => [slice.year, { months: [...slice.months], annualTotal: slice.annualTotal }]),
    );

    for (const year of TARGET_YEARS) {
      const expectedMonths = expectedPayableByYear[year] ?? createZeroSeries();
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

      const expectedAnnual = annualPeriodTotal(expectedMonths);
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

  const totalMismatchRows: ValueMismatch[] = [];
  const totalAnnualMismatches: AnnualMismatch[] = [];

  const expectedTotalByYear = new Map<number, number[]>(
    TARGET_YEARS.map((year) => [
      year,
      sumSeries(
        [...expectedPayableByRowIdByYear.values()].map(
          (payableByYear) => payableByYear[year] ?? createZeroSeries(),
        ),
      ),
    ]),
  );

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
          totalMismatchRows.push({
            rowId: "extraordinary-payables-total",
            year,
            month: monthIndex + 1,
            expected: toRounded(expectedValue),
            actual: toRounded(actualValue),
            diff: toRounded(diff),
          });
        }
      }

      const expectedAnnual = annualPeriodTotal(expectedMonths);
      const actualAnnual = runtimeTotalByYear.get(year)?.annualTotal ?? 0;
      const annualDiff = Math.abs(expectedAnnual - actualAnnual);

      if (annualDiff > TOLERANCE) {
        totalAnnualMismatches.push({
          rowId: "extraordinary-payables-total",
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
    expectedPeriod: toRounded(annualPeriodTotal(expectedTotalByYear.get(year) ?? createZeroSeries())),
    runtimePeriod: toRounded(
      runtimeTotalRow?.yearly.find((slice) => slice.year === year)?.annualTotal ?? 0,
    ),
  }));

  const result = {
    tableId: table.id,
    tableTitle: table.title,
    years: [...TARGET_YEARS],
    condominium: condominium.slug,
    mappingSource: "budget_expense_concept",
    missingRuntimeRows,
    unexpectedRuntimeRows,
    ignoredExpenseConceptKeys: [...ignoredExpenseConceptKeys].sort((left, right) =>
      left.localeCompare(right),
    ),
    valueMismatchCount: valueMismatches.length,
    annualMismatchCount: annualMismatches.length,
    totalMismatchCount: totalMismatchRows.length,
    totalAnnualMismatchCount: totalAnnualMismatches.length,
    sampleValueMismatches: valueMismatches.slice(0, 40),
    sampleAnnualMismatches: annualMismatches.slice(0, 20),
    sampleTotalMismatches: totalMismatchRows.slice(0, 40),
    sampleTotalAnnualMismatches: totalAnnualMismatches.slice(0, 20),
    totals,
    parityOk:
      missingRuntimeRows.length === 0 &&
      unexpectedRuntimeRows.length === 0 &&
      valueMismatches.length === 0 &&
      annualMismatches.length === 0 &&
      totalMismatchRows.length === 0 &&
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
