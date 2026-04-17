import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { getFinancialSummaryUseCase } from "@/modules/financial-summary";
import { prisma } from "@/shared/infrastructure/db/prisma";

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
  rowId: string;
  year: number;
  month: number;
  expected: number;
  actual: number;
  diff: number;
};

type LabelMismatch = {
  rowId: string;
  expected: string;
  actual: string;
};

const LEGACY_YEARS = [2024, 2025, 2026] as const;
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

function createSeries(): YearMonthSeries {
  return Object.fromEntries(LEGACY_YEARS.map((year) => [year, Array.from({ length: 12 }, () => 0)]));
}

async function readNdjsonRows<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const miscCatalogFilePath = path.resolve(scriptDir, "../../data/legacy-export/DCAT_VARIOS.ndjson");
  const incomesFilePath = path.resolve(scriptDir, "../../data/legacy-export/INGRESOS.ndjson");

  const [legacyCatalogRows, legacyIncomeRows] = await Promise.all([
    readNdjsonRows<LegacyMiscIncomeCatalog>(miscCatalogFilePath),
    readNdjsonRows<LegacyIncome>(incomesFilePath),
  ]);

  const activeOrdinaryCatalogs = legacyCatalogRows
    .map((row) => ({
      legacyId: asInt(row.id_dcat_varios),
      label: asString(row.nombre),
      isActive: asInt(row.activo) === 1,
      legacyChargeGroupId: asInt(row.id_cat_grupos_cobro),
    }))
    .filter((row): row is { legacyId: number; label: string | null; isActive: boolean; legacyChargeGroupId: number | null } => row.legacyId !== null)
    .filter((row) => row.isActive && row.legacyChargeGroupId === 2)
    .map((row) => ({
      rowId: `ordinary-other-${row.legacyId}`,
      legacyId: row.legacyId,
      label: row.label ?? `Vario ${row.legacyId}`,
    }));

  const expectedByRowId = new Map<string, YearMonthSeries>();
  const expectedLabelByRowId = new Map<string, string>();
  const catalogByLegacyId = new Map<number, { rowId: string; label: string }>();

  for (const catalog of activeOrdinaryCatalogs) {
    expectedByRowId.set(catalog.rowId, createSeries());
    expectedLabelByRowId.set(catalog.rowId, catalog.label);
    catalogByLegacyId.set(catalog.legacyId, { rowId: catalog.rowId, label: catalog.label });
  }

  for (const income of legacyIncomeRows) {
    if (asInt(income.activo) !== 1) {
      continue;
    }

    const legacyMiscCatalogId = asInt(income.id_dcat_varios);
    if (legacyMiscCatalogId === null) {
      continue;
    }

    const catalog = catalogByLegacyId.get(legacyMiscCatalogId);
    if (!catalog) {
      continue;
    }

    const legacyChargeGroupId = asInt(income.id_cat_grupos_cobro);
    if (legacyChargeGroupId !== null && legacyChargeGroupId !== 0) {
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

    const year = date.getUTCFullYear();
    if (!LEGACY_YEARS.includes(year as (typeof LEGACY_YEARS)[number])) {
      continue;
    }

    const monthIndex = date.getUTCMonth();
    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    const amount = asNumber(income.monto) ?? 0;
    const rowSeries = expectedByRowId.get(catalog.rowId);
    if (!rowSeries) {
      continue;
    }

    rowSeries[year][monthIndex] += amount;
  }

  const legacyRange = {
    from: new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(2027, 0, 1, 0, 0, 0, 0)),
  };

  const activeCondominium =
    (await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true },
    }));

  if (!activeCondominium) {
    throw new Error("No se encontro condominio activo para validar Otros ingresos ordinarios");
  }

  const activeLegacyMiscIds = activeOrdinaryCatalogs.map((row) => row.legacyId);

  const [
    dbRowsForLegacyWindow,
    dbCountWithNullOrZeroGroup,
    dbCountAnyGroup,
    dbRowsAnyMiscLegacyWindow,
    dbTotalIncomeLegacyWindow,
  ] = await Promise.all([
    prisma.income.findMany({
      where: {
        condominiumId: activeCondominium.id,
        isActive: true,
        date: {
          gte: legacyRange.from,
          lt: legacyRange.to,
        },
        legacyMiscCatalogId: {
          in: activeLegacyMiscIds,
        },
      },
      select: {
        legacyMiscCatalogId: true,
        legacyChargeGroupId: true,
      },
    }),
    prisma.income.count({
      where: {
        condominiumId: activeCondominium.id,
        isActive: true,
        date: {
          gte: legacyRange.from,
          lt: legacyRange.to,
        },
        legacyMiscCatalogId: {
          in: activeLegacyMiscIds,
        },
        OR: [{ legacyChargeGroupId: null }, { legacyChargeGroupId: 0 }],
      },
    }),
    prisma.income.count({
      where: {
        condominiumId: activeCondominium.id,
        isActive: true,
        date: {
          gte: legacyRange.from,
          lt: legacyRange.to,
        },
        legacyMiscCatalogId: {
          in: activeLegacyMiscIds,
        },
      },
    }),
    prisma.income.findMany({
      where: {
        condominiumId: activeCondominium.id,
        isActive: true,
        date: {
          gte: legacyRange.from,
          lt: legacyRange.to,
        },
        legacyMiscCatalogId: {
          not: null,
        },
      },
      select: {
        legacyMiscCatalogId: true,
        legacyChargeGroupId: true,
      },
    }),
    prisma.income.count({
      where: {
        condominiumId: activeCondominium.id,
        isActive: true,
        date: {
          gte: legacyRange.from,
          lt: legacyRange.to,
        },
      },
    }),
  ]);

  const dbCountByLegacyChargeGroup = new Map<string, number>();
  for (const row of dbRowsForLegacyWindow) {
    const key = row.legacyChargeGroupId === null ? "null" : `${row.legacyChargeGroupId}`;
    dbCountByLegacyChargeGroup.set(key, (dbCountByLegacyChargeGroup.get(key) ?? 0) + 1);
  }

  const dbAnyMiscCountByLegacyChargeGroup = new Map<string, number>();
  const dbAnyMiscCountByLegacyMiscCatalogId = new Map<string, number>();
  for (const row of dbRowsAnyMiscLegacyWindow) {
    const chargeGroupKey = row.legacyChargeGroupId === null ? "null" : `${row.legacyChargeGroupId}`;
    dbAnyMiscCountByLegacyChargeGroup.set(
      chargeGroupKey,
      (dbAnyMiscCountByLegacyChargeGroup.get(chargeGroupKey) ?? 0) + 1,
    );

    const miscKey = row.legacyMiscCatalogId === null ? "null" : `${row.legacyMiscCatalogId}`;
    dbAnyMiscCountByLegacyMiscCatalogId.set(
      miscKey,
      (dbAnyMiscCountByLegacyMiscCatalogId.get(miscKey) ?? 0) + 1,
    );
  }

  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No se pudo generar resumen financiero para validar Otros ingresos ordinarios");
  }

  const table = summary.ordinaryOtherIncomeMultiYearTable;
  const actualRows = table.rows.filter((row) => !row.isTotal);
  const totalRow = table.rows.find((row) => row.isTotal);

  const actualByRowId = new Map<string, YearMonthSeries>();
  const actualLabelByRowId = new Map<string, string>();

  for (const row of actualRows) {
    const series = createSeries();
    for (const slice of row.yearly) {
      if (LEGACY_YEARS.includes(slice.year as (typeof LEGACY_YEARS)[number])) {
        series[slice.year] = [...slice.months];
      }
    }
    actualByRowId.set(row.id, series);
    actualLabelByRowId.set(row.id, row.label);
  }

  const expectedRowIds = Array.from(expectedByRowId.keys()).sort();
  const actualRowIds = Array.from(actualByRowId.keys()).sort();

  const missingRows = expectedRowIds.filter((id) => !actualByRowId.has(id));
  const unexpectedRows = actualRowIds.filter((id) => !expectedByRowId.has(id));

  const labelMismatches: LabelMismatch[] = [];
  for (const rowId of expectedRowIds) {
    if (!actualLabelByRowId.has(rowId)) {
      continue;
    }

    const expectedLabel = expectedLabelByRowId.get(rowId) ?? "";
    const actualLabel = actualLabelByRowId.get(rowId) ?? "";
    if (normalizeLabel(expectedLabel) !== normalizeLabel(actualLabel)) {
      labelMismatches.push({ rowId, expected: expectedLabel, actual: actualLabel });
    }
  }

  const valueMismatches: ValueMismatch[] = [];
  for (const rowId of expectedRowIds) {
    const expected = expectedByRowId.get(rowId);
    const actual = actualByRowId.get(rowId);
    if (!expected || !actual) {
      continue;
    }

    for (const year of LEGACY_YEARS) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const expectedValue = expected[year][monthIndex] ?? 0;
        const actualValue = actual[year][monthIndex] ?? 0;
        const diff = Math.abs(expectedValue - actualValue);
        if (diff > TOLERANCE) {
          valueMismatches.push({
            rowId,
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

  const totalMismatches: Array<Omit<ValueMismatch, "rowId">> = [];
  if (totalRow) {
    const actualTotalByYear = new Map<number, number[]>();
    for (const slice of totalRow.yearly) {
      if (LEGACY_YEARS.includes(slice.year as (typeof LEGACY_YEARS)[number])) {
        actualTotalByYear.set(slice.year, [...slice.months]);
      }
    }

    for (const year of LEGACY_YEARS) {
      const expectedMonths = Array.from({ length: 12 }, (_, monthIndex) =>
        expectedRowIds.reduce(
          (acc, rowId) => acc + (expectedByRowId.get(rowId)?.[year][monthIndex] ?? 0),
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

  const result = {
    tableId: table.id,
    tableTitle: table.title,
    years: table.years,
    expectedRowCount: expectedRowIds.length,
    actualRowCount: actualRowIds.length,
    missingRows,
    unexpectedRows,
    labelMismatchCount: labelMismatches.length,
    valueMismatchCount: valueMismatches.length,
    totalMismatchCount: totalMismatches.length,
    sampleLabelMismatches: labelMismatches.slice(0, 10),
    sampleValueMismatches: valueMismatches.slice(0, 20),
    sampleTotalMismatches: totalMismatches.slice(0, 20),
    dbDebug: {
      condominiumSlug: activeCondominium.slug,
      activeLegacyMiscCatalogIds: activeLegacyMiscIds,
      rowsWithLegacyMiscAnyGroup: dbCountAnyGroup,
      rowsWithLegacyMiscAndNullOrZeroGroup: dbCountWithNullOrZeroGroup,
      rowsByLegacyChargeGroup: Object.fromEntries(dbCountByLegacyChargeGroup.entries()),
      totalIncomeRowsLegacyWindow: dbTotalIncomeLegacyWindow,
      rowsWithAnyLegacyMiscCatalog: dbRowsAnyMiscLegacyWindow.length,
      anyLegacyMiscRowsByChargeGroup: Object.fromEntries(dbAnyMiscCountByLegacyChargeGroup.entries()),
      anyLegacyMiscRowsByLegacyMiscCatalogId: Object.fromEntries(dbAnyMiscCountByLegacyMiscCatalogId.entries()),
    },
    parityOk:
      missingRows.length === 0 &&
      unexpectedRows.length === 0 &&
      labelMismatches.length === 0 &&
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