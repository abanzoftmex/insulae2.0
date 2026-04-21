import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyPaymentRow = {
  id_historico_pagos?: unknown;
  id_areas_privativas?: unknown;
  id_cat_status_historico_pagos?: unknown;
  activo?: unknown;
  fechaPago?: unknown;
};

type LegacyPaymentDetailRow = {
  id_historico_pagos?: unknown;
  id_cat_grupos_cobro?: unknown;
  monto?: unknown;
  activo?: unknown;
};

type LegacyAreaRow = {
  id_areas_privativas?: unknown;
  activo?: unknown;
};

type LegacyIncomeRow = {
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_cat_grupos_cobro?: unknown;
  id_dcat_varios?: unknown;
};

type LegacyMiscIncomeCatalogRow = {
  id_dcat_varios?: unknown;
  activo?: unknown;
  id_cat_grupos_cobro?: unknown;
};

type LegacyExpenseRow = {
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_cat_conceptos_presupuesto?: unknown;
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
const EXTRAORDINARY_CHARGE_GROUPS = new Set([3, 6]);

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

function createYearSeries(): YearSeries {
  return Object.fromEntries(TARGET_YEARS.map((year) => [year, createZeroSeries()]));
}

function sumSeries(seriesList: number[][]): number[] {
  const output = createZeroSeries();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    output[monthIndex] = seriesList.reduce((acc, series) => acc + (series[monthIndex] ?? 0), 0);
  }

  return output;
}

function subtractSeries(base: number[], subtrahend: number[]): number[] {
  return base.map((value, index) => value - (subtrahend[index] ?? 0));
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

function addAmountToYearMonth(series: YearSeries, year: number, monthIndex: number, amount: number): void {
  if (!TARGET_YEARS.includes(year as (typeof TARGET_YEARS)[number])) {
    return;
  }

  if (monthIndex < 0 || monthIndex > 11) {
    return;
  }

  series[year][monthIndex] += amount;
}

function toAnnualTotal(series: number[]): number {
  return series.reduce((acc, value) => acc + value, 0);
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

function toSliceByYear(row: { yearly: Array<{ year: number; months: number[]; annualTotal: number }> }): Map<number, { months: number[]; annualTotal: number }> {
  return new Map(
    row.yearly.map((slice) => [slice.year, { months: [...slice.months], annualTotal: slice.annualTotal }]),
  );
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
    throw new Error("No se encontro condominio activo para validar saldo extraordinario");
  }

  const extraordinaryConcepts = await prisma.budgetExpenseConcept.findMany({
    where: {
      condominiumId: condominium.id,
      year: { in: [...TARGET_YEARS] },
      budgetGroup: "EXTRAORDINARY",
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

  if (extraordinaryConceptKeys.size === 0) {
    throw new Error(
      "No hay mapeo canonico en budget_expense_concept para grupo EXTRAORDINARY. Ejecuta ETL/backfill antes de validar paridad.",
    );
  }

  const [
    paymentRows,
    paymentDetailRows,
    areaRows,
    incomeRows,
    miscCatalogRows,
    expenseRows,
  ] = await Promise.all([
    readNdjsonRows<LegacyPaymentRow>(path.resolve(scriptDir, "../../data/legacy-export/HISTORICO_PAGOS.ndjson")),
    readNdjsonRows<LegacyPaymentDetailRow>(path.resolve(scriptDir, "../../data/legacy-export/HISTORICO_PAGOS_DETALLE.ndjson")),
    readNdjsonRows<LegacyAreaRow>(path.resolve(scriptDir, "../../data/legacy-export/AREAS_PRIVATIVAS.ndjson")),
    readNdjsonRows<LegacyIncomeRow>(path.resolve(scriptDir, "../../data/legacy-export/INGRESOS.ndjson")),
    readNdjsonRows<LegacyMiscIncomeCatalogRow>(path.resolve(scriptDir, "../../data/legacy-export/DCAT_VARIOS.ndjson")),
    readNdjsonRows<LegacyExpenseRow>(path.resolve(scriptDir, "../../data/legacy-export/GASTOS.ndjson")),
  ]);

  const activeAreaIds = new Set<number>(
    areaRows
      .filter((row) => asInt(row.activo) === 1)
      .map((row) => asInt(row.id_areas_privativas))
      .filter((value): value is number => value !== null),
  );

  const paymentById = new Map<number, LegacyPaymentRow>(
    paymentRows
      .map((row) => [asInt(row.id_historico_pagos), row] as const)
      .filter((entry): entry is [number, LegacyPaymentRow] => entry[0] !== null),
  );

  const extraordinaryIncomeSeriesByYear = createYearSeries();

  for (const detail of paymentDetailRows) {
    if (asInt(detail.activo) !== 1) {
      continue;
    }

    const chargeGroupId = asInt(detail.id_cat_grupos_cobro);
    if (chargeGroupId === null || !EXTRAORDINARY_CHARGE_GROUPS.has(chargeGroupId)) {
      continue;
    }

    const paymentId = asInt(detail.id_historico_pagos);
    if (paymentId === null) {
      continue;
    }

    const payment = paymentById.get(paymentId);
    if (!payment) {
      continue;
    }

    if (asInt(payment.id_cat_status_historico_pagos) !== 1 || asInt(payment.activo) !== 1) {
      continue;
    }

    const areaId = asInt(payment.id_areas_privativas);
    if (areaId === null || !activeAreaIds.has(areaId)) {
      continue;
    }

    const dateRaw = typeof payment.fechaPago === "string" ? payment.fechaPago : null;
    if (!dateRaw) {
      continue;
    }

    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const amount = asNumber(detail.monto) ?? 0;
    addAmountToYearMonth(
      extraordinaryIncomeSeriesByYear,
      date.getUTCFullYear(),
      date.getUTCMonth(),
      amount,
    );
  }

  for (const income of incomeRows) {
    if (asInt(income.activo) !== 1) {
      continue;
    }

    const chargeGroupId = asInt(income.id_cat_grupos_cobro);
    if (chargeGroupId === null || !EXTRAORDINARY_CHARGE_GROUPS.has(chargeGroupId)) {
      continue;
    }

    const dateRaw = typeof income.fecha === "string" ? income.fecha : null;
    if (!dateRaw) {
      continue;
    }

    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const amount = asNumber(income.monto) ?? 0;
    addAmountToYearMonth(
      extraordinaryIncomeSeriesByYear,
      date.getUTCFullYear(),
      date.getUTCMonth(),
      amount,
    );
  }

  const extraordinaryMiscCatalogIds = new Set<number>(
    miscCatalogRows
      .filter((row) => asInt(row.activo) === 1)
      .filter((row) => {
        const chargeGroupId = asInt(row.id_cat_grupos_cobro);
        return chargeGroupId !== null && EXTRAORDINARY_CHARGE_GROUPS.has(chargeGroupId);
      })
      .map((row) => asInt(row.id_dcat_varios))
      .filter((value): value is number => value !== null),
  );

  const extraordinaryOtherIncomeSeriesByYear = createYearSeries();
  for (const income of incomeRows) {
    if (asInt(income.activo) !== 1) {
      continue;
    }

    const miscCatalogId = asInt(income.id_dcat_varios);
    if (miscCatalogId === null || !extraordinaryMiscCatalogIds.has(miscCatalogId)) {
      continue;
    }

    const chargeGroupId = asInt(income.id_cat_grupos_cobro);
    if (chargeGroupId !== null && chargeGroupId !== 0) {
      continue;
    }

    const dateRaw = typeof income.fecha === "string" ? income.fecha : null;
    if (!dateRaw) {
      continue;
    }

    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const amount = asNumber(income.monto) ?? 0;
    addAmountToYearMonth(
      extraordinaryOtherIncomeSeriesByYear,
      date.getUTCFullYear(),
      date.getUTCMonth(),
      amount,
    );
  }

  const extraordinaryExpenseSeriesByYear = createYearSeries();
  const ignoredExpenseConceptKeys = new Set<string>();

  for (const expense of expenseRows) {
    if (asInt(expense.activo) !== 1) {
      continue;
    }

    const conceptId = asInt(expense.id_cat_conceptos_presupuesto);
    if (conceptId === null) {
      continue;
    }

    const dateRaw = typeof expense.fecha === "string" ? expense.fecha : null;
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

    const amount = asNumber(expense.monto) ?? 0;
    addAmountToYearMonth(
      extraordinaryExpenseSeriesByYear,
      year,
      date.getUTCMonth(),
      amount,
    );
  }

  const expectedBalanceByYear = new Map<number, number[]>();
  const expectedBanksCashByYear = new Map<number, number[]>();

  for (const year of TARGET_YEARS) {
    const totalIncome = sumSeries([
      extraordinaryIncomeSeriesByYear[year],
      extraordinaryOtherIncomeSeriesByYear[year],
    ]);
    const balance = subtractSeries(totalIncome, extraordinaryExpenseSeriesByYear[year]);

    expectedBalanceByYear.set(year, balance);
    expectedBanksCashByYear.set(year, cumulativeSeries(balance));
  }

  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No fue posible generar el resumen financiero en runtime");
  }

  const table = summary.extraordinaryBalanceMultiYearTable;
  const runtimeRowById = new Map(table.rows.map((row) => [row.id, row]));

  const runtimeBalanceRow = runtimeRowById.get("extraordinary-balance-total") ?? null;
  const runtimeBanksCashRow = runtimeRowById.get("extraordinary-banks-cash") ?? null;

  const missingRuntimeRows: string[] = [];
  if (!runtimeBalanceRow) {
    missingRuntimeRows.push("extraordinary-balance-total");
  }
  if (!runtimeBanksCashRow) {
    missingRuntimeRows.push("extraordinary-banks-cash");
  }

  const valueMismatches: ValueMismatch[] = [];
  const annualMismatches: AnnualMismatch[] = [];

  if (runtimeBalanceRow && runtimeBanksCashRow) {
    const runtimeBalanceByYear = toSliceByYear(runtimeBalanceRow);
    const runtimeBanksByYear = toSliceByYear(runtimeBanksCashRow);

    for (const year of TARGET_YEARS) {
      const expectedBalance = expectedBalanceByYear.get(year) ?? createZeroSeries();
      const expectedBanksCash = expectedBanksCashByYear.get(year) ?? createZeroSeries();

      const actualBalance = runtimeBalanceByYear.get(year)?.months ?? createZeroSeries();
      const actualBanksCash = runtimeBanksByYear.get(year)?.months ?? createZeroSeries();

      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedBalanceValue = expectedBalance[monthIndex] ?? 0;
        const actualBalanceValue = actualBalance[monthIndex] ?? 0;
        const balanceDiff = Math.abs(expectedBalanceValue - actualBalanceValue);

        if (balanceDiff > TOLERANCE) {
          valueMismatches.push({
            rowId: "extraordinary-balance-total",
            year,
            month: monthIndex + 1,
            expected: toRounded(expectedBalanceValue),
            actual: toRounded(actualBalanceValue),
            diff: toRounded(balanceDiff),
          });
        }

        const expectedBanksValue = expectedBanksCash[monthIndex] ?? 0;
        const actualBanksValue = actualBanksCash[monthIndex] ?? 0;
        const banksDiff = Math.abs(expectedBanksValue - actualBanksValue);

        if (banksDiff > TOLERANCE) {
          valueMismatches.push({
            rowId: "extraordinary-banks-cash",
            year,
            month: monthIndex + 1,
            expected: toRounded(expectedBanksValue),
            actual: toRounded(actualBanksValue),
            diff: toRounded(banksDiff),
          });
        }
      }

      const expectedBalanceAnnual = toAnnualTotal(expectedBalance);
      const actualBalanceAnnual = runtimeBalanceByYear.get(year)?.annualTotal ?? 0;
      const balanceAnnualDiff = Math.abs(expectedBalanceAnnual - actualBalanceAnnual);

      if (balanceAnnualDiff > TOLERANCE) {
        annualMismatches.push({
          rowId: "extraordinary-balance-total",
          year,
          expected: toRounded(expectedBalanceAnnual),
          actual: toRounded(actualBalanceAnnual),
          diff: toRounded(balanceAnnualDiff),
        });
      }

      const expectedBanksAnnual = toAnnualTotal(expectedBanksCash);
      const actualBanksAnnual = runtimeBanksByYear.get(year)?.annualTotal ?? 0;
      const banksAnnualDiff = Math.abs(expectedBanksAnnual - actualBanksAnnual);

      if (banksAnnualDiff > TOLERANCE) {
        annualMismatches.push({
          rowId: "extraordinary-banks-cash",
          year,
          expected: toRounded(expectedBanksAnnual),
          actual: toRounded(actualBanksAnnual),
          diff: toRounded(banksAnnualDiff),
        });
      }
    }
  }

  const totals = TARGET_YEARS.map((year) => ({
    year,
    expectedBalanceAnnual: toRounded(toAnnualTotal(expectedBalanceByYear.get(year) ?? createZeroSeries())),
    expectedBanksCashAnnual: toRounded(toAnnualTotal(expectedBanksCashByYear.get(year) ?? createZeroSeries())),
    runtimeBalanceAnnual: toRounded(
      runtimeBalanceRow?.yearly.find((slice) => slice.year === year)?.annualTotal ?? 0,
    ),
    runtimeBanksCashAnnual: toRounded(
      runtimeBanksCashRow?.yearly.find((slice) => slice.year === year)?.annualTotal ?? 0,
    ),
  }));

  const result = {
    tableId: table.id,
    tableTitle: table.title,
    years: [...TARGET_YEARS],
    condominium: condominium.slug,
    mappingSource: "budget_expense_concept",
    missingRuntimeRows,
    ignoredExpenseConceptKeys: [...ignoredExpenseConceptKeys].sort((left, right) =>
      left.localeCompare(right),
    ),
    valueMismatchCount: valueMismatches.length,
    annualMismatchCount: annualMismatches.length,
    sampleValueMismatches: valueMismatches.slice(0, 40),
    sampleAnnualMismatches: annualMismatches.slice(0, 20),
    totals,
    parityOk:
      missingRuntimeRows.length === 0 &&
      valueMismatches.length === 0 &&
      annualMismatches.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
