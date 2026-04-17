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
  debug: {
    conceptRows: number;
    budgetGroupRows: number;
    chargeGroupRows: number;
    ordinaryConcepts: number;
    extraordinaryConcepts: number;
  };
}> {
  const runs = await prisma.migrationRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
    },
  });

  for (const run of runs) {
    const [conceptRows, budgetGroupRows, chargeGroupRows] = await Promise.all([
      prisma.legacyStagingRow.findMany({
        where: {
          runId: run.id,
          legacyTable: { in: [...LEGACY_CONCEPT_TABLES] },
        },
        select: {
          payload: true,
        },
      }),
      prisma.legacyStagingRow.findMany({
        where: {
          runId: run.id,
          legacyTable: { in: [...LEGACY_BUDGET_GROUP_TABLES] },
        },
        select: {
          payload: true,
        },
      }),
      prisma.legacyStagingRow.findMany({
        where: {
          runId: run.id,
          legacyTable: "CAT_GRUPOS_COBRO",
        },
        select: {
          payload: true,
        },
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

    const ordinaryConcepts = Array.from(conceptBuckets.values()).filter((value) => value === "ordinary").length;
    const extraordinaryConcepts = conceptBuckets.size - ordinaryConcepts;

    return {
      runId: run.id,
      conceptBuckets,
      debug: {
        conceptRows: conceptRows.length,
        budgetGroupRows: budgetGroupRows.length,
        chargeGroupRows: chargeGroupRows.length,
        ordinaryConcepts,
        extraordinaryConcepts,
      },
    };
  }

  return {
    runId: null,
    conceptBuckets: new Map<number, Bucket>(),
    debug: {
      conceptRows: 0,
      budgetGroupRows: 0,
      chargeGroupRows: 0,
      ordinaryConcepts: 0,
      extraordinaryConcepts: 0,
    },
  };
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

  const expectedOrdinary = createYearSeries();

  for (const expense of legacyExpenses) {
    if (asInt(expense.activo) !== 1) {
      continue;
    }

    const conceptId = asInt(expense.id_cat_conceptos_presupuesto);
    if (conceptId === null) {
      continue;
    }

    const bucket = conceptBuckets.get(conceptId);
    if (bucket !== "ordinary") {
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

    addAmountToYearMonth(expectedOrdinary, year, monthIndex, amount);
  }

  const actualOrdinary = createYearSeries();

  const activeCondominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  if (!activeCondominium) {
    throw new Error("No se encontro condominio activo para validar egresos ordinarios");
  }

  const dbExpenseRows = await prisma.expense.findMany({
    where: {
      condominiumId: activeCondominium.id,
      isActive: true,
      date: {
        gte: new Date(Date.UTC(TARGET_YEARS[0], 0, 1, 0, 0, 0, 0)),
        lt: new Date(Date.UTC(TARGET_YEARS[TARGET_YEARS.length - 1] + 1, 0, 1, 0, 0, 0, 0)),
      },
    },
    select: {
      date: true,
      legacyBudgetConceptId: true,
    },
  });

  for (const year of TARGET_YEARS) {
    const summary = await getFinancialSummaryUseCase.execute({ year });
    if (!summary) {
      throw new Error(`No se pudo generar resumen financiero para ${year}`);
    }

    const ordinaryBlock = summary.blocks.find((block) => block.id === "ordinary");
    const ordinaryExpensesTable = ordinaryBlock?.tables.find((table) => table.id === "ordinary-expenses");
    const ordinaryRow = ordinaryExpensesTable?.rows.find((row) => row.id === "ordinary-expense");

    if (!ordinaryRow) {
      throw new Error(`No se encontro fila ordinary-expense para ${year}`);
    }

    actualOrdinary[year] = [...ordinaryRow.months];
  }

  const valueMismatches: ValueMismatch[] = [];
  for (const year of TARGET_YEARS) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const expected = expectedOrdinary[year][monthIndex] ?? 0;
      const actual = actualOrdinary[year][monthIndex] ?? 0;
      const diff = Math.abs(expected - actual);

      if (diff > TOLERANCE) {
        valueMismatches.push({
          year,
          month: monthIndex + 1,
          expected: Number(expected.toFixed(2)),
          actual: Number(actual.toFixed(2)),
          diff: Number(diff.toFixed(2)),
        });
      }
    }
  }

  const totals = TARGET_YEARS.map((year) => ({
    year,
    expected: Number(expectedOrdinary[year].reduce((sum, value) => sum + value, 0).toFixed(2)),
    actual: Number(actualOrdinary[year].reduce((sum, value) => sum + value, 0).toFixed(2)),
  }));

  const dbDebug = {
    condominiumSlug: activeCondominium.slug,
    totalRows: dbExpenseRows.length,
    rowsWithLegacyBudgetConcept: dbExpenseRows.filter((row) => row.legacyBudgetConceptId !== null).length,
    rowsWithoutLegacyBudgetConcept: dbExpenseRows.filter((row) => row.legacyBudgetConceptId === null).length,
    rowsWithConcept122: dbExpenseRows.filter((row) => row.legacyBudgetConceptId === 122).length,
    byYear: Object.fromEntries(
      TARGET_YEARS.map((year) => {
        const rows = dbExpenseRows.filter((row) => row.date.getUTCFullYear() === year);
        return [
          year,
          {
            totalRows: rows.length,
            concept122: rows.filter((row) => row.legacyBudgetConceptId === 122).length,
            non122: rows.filter(
              (row) => row.legacyBudgetConceptId !== null && row.legacyBudgetConceptId !== 122,
            ).length,
            nullConcept: rows.filter((row) => row.legacyBudgetConceptId === null).length,
          },
        ];
      }),
    ),
  };

  const result = {
    years: [...TARGET_YEARS],
    mappingStrategy,
    legacyMappingRunId: conceptBucketData.runId,
    legacyMappingDebug: conceptBucketData.debug,
    dbDebug,
    mismatchCount: valueMismatches.length,
    sampleMismatches: valueMismatches.slice(0, 30),
    totals,
    parityOk: valueMismatches.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
