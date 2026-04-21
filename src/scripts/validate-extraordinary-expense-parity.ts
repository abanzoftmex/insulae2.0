import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyExpense = {
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_cat_conceptos_presupuesto?: unknown;
};

type LegacyConceptPayload = {
  id_cat_conceptos_presupuesto?: unknown;
  id_cat_grupos_presupuesto?: unknown;
  activo?: unknown;
};

type LegacyBudgetGroupPayload = {
  id_cat_grupos_presupuesto?: unknown;
  id_cat_grupos_cobro?: unknown;
  activo?: unknown;
};

type LegacyChargeGroupPayload = {
  id_cat_grupos_cobro?: unknown;
  noCambiar_sad?: unknown;
  activo?: unknown;
};

type Bucket = "ordinary" | "extraordinary";

type YearSeries = Record<number, number[]>;

type ValueMismatch = {
  conceptId: number;
  year: number;
  month: number;
  expected: number;
  actual: number;
  diff: number;
};

const TARGET_YEARS = [2024, 2025, 2026] as const;
const TOLERANCE = 0.005;

const LEGACY_CONCEPT_TABLES = [
  "CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203",
  "CAT_CONCEPTOS_PRESUPUESTO",
] as const;

const LEGACY_BUDGET_GROUP_TABLES = [
  "CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203",
  "CAT_GRUPOS_PRESUPUESTO",
] as const;

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

function createYearSeries(): YearSeries {
  return Object.fromEntries(TARGET_YEARS.map((year) => [year, Array.from({ length: 12 }, () => 0)]));
}

async function readNdjsonRows<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
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

async function resolveConceptBucketsFromLegacyStaging(): Promise<{
  runId: string | null;
  conceptBuckets: Map<number, Bucket>;
}> {
  const runs = await prisma.migrationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true },
  });

  for (const run of runs) {
    const [conceptRows, budgetGroupRows, chargeGroupRows] = await Promise.all([
      prisma.legacyStagingRow.findMany({
        where: {
          runId: run.id,
          legacyTable: { in: [...LEGACY_CONCEPT_TABLES] },
        },
        select: { payload: true },
      }),
      prisma.legacyStagingRow.findMany({
        where: {
          runId: run.id,
          legacyTable: { in: [...LEGACY_BUDGET_GROUP_TABLES] },
        },
        select: { payload: true },
      }),
      prisma.legacyStagingRow.findMany({
        where: {
          runId: run.id,
          legacyTable: "CAT_GRUPOS_COBRO",
        },
        select: { payload: true },
      }),
    ]);

    if (conceptRows.length === 0 || budgetGroupRows.length === 0 || chargeGroupRows.length === 0) {
      continue;
    }

    const chargeNoCambiarById = new Map<number, number | null>();
    for (const row of chargeGroupRows) {
      const payload = row.payload as LegacyChargeGroupPayload;
      if (asInt(payload.activo) !== 1) {
        continue;
      }

      const chargeGroupId = asInt(payload.id_cat_grupos_cobro);
      if (chargeGroupId === null) {
        continue;
      }

      chargeNoCambiarById.set(chargeGroupId, asInt(payload.noCambiar_sad));
    }

    const budgetGroupToChargeGroup = new Map<number, number>();
    for (const row of budgetGroupRows) {
      const payload = row.payload as LegacyBudgetGroupPayload;
      if (asInt(payload.activo) !== 1) {
        continue;
      }

      const budgetGroupId = asInt(payload.id_cat_grupos_presupuesto);
      const chargeGroupId = asInt(payload.id_cat_grupos_cobro);

      if (budgetGroupId === null || chargeGroupId === null) {
        continue;
      }

      budgetGroupToChargeGroup.set(budgetGroupId, chargeGroupId);
    }

    const conceptBuckets = new Map<number, Bucket>();
    for (const row of conceptRows) {
      const payload = row.payload as LegacyConceptPayload;
      if (asInt(payload.activo) !== 1) {
        continue;
      }

      const conceptId = asInt(payload.id_cat_conceptos_presupuesto);
      const budgetGroupId = asInt(payload.id_cat_grupos_presupuesto);

      if (conceptId === null || budgetGroupId === null) {
        continue;
      }

      const chargeGroupId = budgetGroupToChargeGroup.get(budgetGroupId);
      if (chargeGroupId === undefined) {
        continue;
      }

      const noCambiarSad = chargeNoCambiarById.get(chargeGroupId) ?? null;
      const bucket: Bucket = noCambiarSad === 2 || noCambiarSad === 3
        ? "extraordinary"
        : "ordinary";

      conceptBuckets.set(conceptId, bucket);
    }

    return {
      runId: run.id,
      conceptBuckets,
    };
  }

  return {
    runId: null,
    conceptBuckets: new Map<number, Bucket>(),
  };
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
  const expensesFilePath = path.resolve(scriptDir, "../../data/legacy-export/GASTOS.ndjson");

  const [legacyExpenses, conceptBucketData] = await Promise.all([
    readNdjsonRows<LegacyExpense>(expensesFilePath),
    resolveConceptBucketsFromLegacyStaging(),
  ]);

  const conceptBuckets = new Map<number, Bucket>(conceptBucketData.conceptBuckets);

  let mappingStrategy: "staging-concept-map" | "fallback-122" = "staging-concept-map";
  if (conceptBuckets.size === 0) {
    mappingStrategy = "fallback-122";

    const conceptIds = new Set<number>();
    for (const expense of legacyExpenses) {
      const conceptId = asInt(expense.id_cat_conceptos_presupuesto);
      if (conceptId !== null) {
        conceptIds.add(conceptId);
      }
    }

    for (const conceptId of conceptIds) {
      conceptBuckets.set(conceptId, conceptId === 122 ? "extraordinary" : "ordinary");
    }
  }

  const expectedByConceptId = new Map<number, YearSeries>();

  for (const expense of legacyExpenses) {
    if (asInt(expense.activo) !== 1) {
      continue;
    }

    const conceptId = asInt(expense.id_cat_conceptos_presupuesto);
    if (conceptId === null) {
      continue;
    }

    const bucket = conceptBuckets.get(conceptId);
    if (bucket !== "extraordinary") {
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
    const monthIndex = date.getUTCMonth();
    const amount = asNumber(expense.monto) ?? 0;

    if (!expectedByConceptId.has(conceptId)) {
      expectedByConceptId.set(conceptId, createYearSeries());
    }

    addAmountToYearMonth(expectedByConceptId.get(conceptId)!, year, monthIndex, amount);
  }

  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No se pudo generar resumen financiero para validar egresos extraordinarios");
  }

  const table = summary.extraordinaryExpensesMultiYearTable;
  const actualRows = table.rows.filter((row) => !row.isTotal);
  const totalRow = table.rows.find((row) => row.isTotal);

  const actualByConceptId = new Map<number, YearSeries>();
  const actualLabelsByConceptId = new Map<number, string>();
  const nonCanonicalRowIds: string[] = [];

  for (const row of actualRows) {
    const conceptId = parseConceptIdFromRowId(row.id);
    if (conceptId === null) {
      nonCanonicalRowIds.push(row.id);
      continue;
    }

    const series = createYearSeries();
    for (const slice of row.yearly) {
      if (!TARGET_YEARS.includes(slice.year as (typeof TARGET_YEARS)[number])) {
        continue;
      }

      series[slice.year] = [...slice.months];
    }

    actualByConceptId.set(conceptId, series);
    actualLabelsByConceptId.set(conceptId, row.label);
  }

  const expectedConceptIds = [...expectedByConceptId.keys()].sort((a, b) => a - b);
  const actualConceptIds = [...actualByConceptId.keys()].sort((a, b) => a - b);

  const missingConceptIds = expectedConceptIds.filter((conceptId) => !actualByConceptId.has(conceptId));
  const unexpectedConceptIds = actualConceptIds.filter((conceptId) => !expectedByConceptId.has(conceptId));

  const valueMismatches: ValueMismatch[] = [];

  for (const conceptId of expectedConceptIds) {
    const expected = expectedByConceptId.get(conceptId);
    const actual = actualByConceptId.get(conceptId);
    if (!expected || !actual) {
      continue;
    }

    for (const year of TARGET_YEARS) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedValue = expected[year][monthIndex] ?? 0;
        const actualValue = actual[year][monthIndex] ?? 0;
        const diff = Math.abs(expectedValue - actualValue);

        if (diff > TOLERANCE) {
          valueMismatches.push({
            conceptId,
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

  const totalMismatches: Array<Omit<ValueMismatch, "conceptId">> = [];
  if (totalRow) {
    const actualTotalByYear = new Map<number, number[]>();
    for (const slice of totalRow.yearly) {
      if (TARGET_YEARS.includes(slice.year as (typeof TARGET_YEARS)[number])) {
        actualTotalByYear.set(slice.year, [...slice.months]);
      }
    }

    for (const year of TARGET_YEARS) {
      const expectedMonths = Array.from({ length: 12 }, (_, monthIndex) =>
        expectedConceptIds.reduce(
          (sum, conceptId) => sum + (expectedByConceptId.get(conceptId)?.[year][monthIndex] ?? 0),
          0,
        ),
      );

      const actualMonths = actualTotalByYear.get(year) ?? Array.from({ length: 12 }, () => 0);

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

  const totals = TARGET_YEARS.map((year) => ({
    year,
    expected: Number(
      expectedConceptIds
        .reduce((sum, conceptId) => sum + (expectedByConceptId.get(conceptId)?.[year].reduce((acc, value) => acc + value, 0) ?? 0), 0)
        .toFixed(2),
    ),
    actual: Number(
      actualConceptIds
        .reduce((sum, conceptId) => sum + (actualByConceptId.get(conceptId)?.[year].reduce((acc, value) => acc + value, 0) ?? 0), 0)
        .toFixed(2),
    ),
  }));

  const result = {
    tableId: table.id,
    tableTitle: table.title,
    years: [...TARGET_YEARS],
    mappingStrategy,
    legacyMappingRunId: conceptBucketData.runId,
    expectedRowCount: expectedConceptIds.length,
    actualRowCount: actualConceptIds.length,
    missingConceptIds,
    unexpectedConceptIds,
    nonCanonicalRowIds,
    sampleLabelsByConceptId: Object.fromEntries(
      [...actualLabelsByConceptId.entries()].sort((left, right) => left[0] - right[0]),
    ),
    mismatchCount: valueMismatches.length,
    totalMismatchCount: totalMismatches.length,
    sampleMismatches: valueMismatches.slice(0, 40),
    sampleTotalMismatches: totalMismatches.slice(0, 40),
    totals,
    parityOk:
      missingConceptIds.length === 0 &&
      unexpectedConceptIds.length === 0 &&
      nonCanonicalRowIds.length === 0 &&
      valueMismatches.length === 0 &&
      totalMismatches.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
