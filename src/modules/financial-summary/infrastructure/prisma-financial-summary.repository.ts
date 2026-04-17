import { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import {
  CHARGE_GROUP_KIND,
  resolveChargeGroupKind,
  type ChargeGroupKind,
} from "@/shared/domain/charge-group-kind";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  FinancialSummaryBlock,
  FinancialSummary,
  FinancialSummaryInput,
  FinancialSummaryMultiYearTable,
  FinancialSummaryOrdinaryPayableTable,
  FinancialSummaryOrdinaryPayableRow,
  FinancialSummaryOrdinaryReceivableRow,
  FinancialSummaryOrdinaryReceivableTable,
  FinancialSummaryYearSlice,
  FinancialSummaryMonth,
  FinancialSummaryTableRow,
} from "../domain/financial-summary";
import type { FinancialSummaryRepository } from "../domain/financial-summary.repository";

type IncomeBucket = "ordinary" | "extraordinary" | "other";
type ExpenseBucket = "ordinary" | "extraordinary";

type ChargeGroupSnapshot = {
  id: string;
  legacyId: number | null;
  name: string;
  chargeType: string | null;
};

type PaymentDetailSnapshot = {
  amount: Prisma.Decimal | number;
  chargeGroupId: string | null;
  payment: {
    paidAt: Date;
    legacyStatusCode?: number | null;
    isLegacyActive?: boolean | null;
    legacyAreaIsActive?: boolean | null;
  };
};

type IncomeSnapshot = {
  amount: Prisma.Decimal | number;
  date: Date;
  legacyChargeGroupId: number | null;
  legacyMiscCatalogId: number | null;
};

type MiscIncomeCatalogSnapshot = {
  legacyId: number | null;
  name: string;
};

type ExpenseSnapshot = {
  amount: Prisma.Decimal | number;
  date: Date;
  concept: string;
  notes: string | null;
  legacyBudgetConceptId: number | null;
  legacyProjectName: string | null;
};

type CanonicalExpenseConceptGroupSnapshot = {
  year: number;
  legacyBudgetConceptId: number;
  budgetGroupId: number;
};

type ChargeLedgerSnapshot = {
  amount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
  periodYear: number;
  periodMonth: number;
  chargeGroupId: string;
};

type BudgetMonthSnapshot = {
  month: number;
  amount: Prisma.Decimal | number;
};

type BudgetLineSnapshot = {
  legacyId: number | null;
  months: BudgetMonthSnapshot[];
};

type BudgetSnapshot = {
  lines: BudgetLineSnapshot[];
};

type DateAggregateResult = {
  _min?: {
    date: Date | null;
  };
  _max?: {
    date: Date | null;
  };
};

type PaymentDateAggregateResult = {
  _min: {
    paidAt: Date | null;
  };
  _max: {
    paidAt: Date | null;
  };
};

type IncomeDelegate = {
  findMany(args: unknown): Promise<IncomeSnapshot[]>;
  aggregate(args: unknown): Promise<DateAggregateResult>;
};

type ExpenseDelegate = {
  findMany(args: unknown): Promise<ExpenseSnapshot[]>;
  aggregate(args: unknown): Promise<DateAggregateResult>;
};


const incomeModel = (
  prisma as unknown as {
    income: IncomeDelegate;
  }
).income;

const expenseModel = (
  prisma as unknown as {
    expense: ExpenseDelegate;
  }
).expense;


const EXTRAORDINARY_KINDS = new Set<ChargeGroupKind>([
  CHARGE_GROUP_KIND.EXTRA_CONDO,
  CHARGE_GROUP_KIND.EXTRA_COMMERCE,
  CHARGE_GROUP_KIND.STC,
  CHARGE_GROUP_KIND.SANCTION,
  CHARGE_GROUP_KIND.COMODATO,
]);

const EXTENDED_CHARGE_KINDS = [
  CHARGE_GROUP_KIND.ORDINARY,
  CHARGE_GROUP_KIND.STC,
  CHARGE_GROUP_KIND.SANCTION,
  CHARGE_GROUP_KIND.COMODATO,
  CHARGE_GROUP_KIND.EXTRA_CONDO,
  CHARGE_GROUP_KIND.EXTRA_COMMERCE,
  CHARGE_GROUP_KIND.OTHER,
] as const;

const LEGACY_VISIBLE_YEARS = [2024, 2025, 2026] as const;

const LEGACY_ORDINARY_INCOME_ROWS = [
  { id: "ordinary-fee", label: "Cuotas ordinarias", legacyGroupId: 2 },
  { id: "stc-fee", label: "Cuotas STC", legacyGroupId: 4 },
  { id: "sanction-fee", label: "Sancion", legacyGroupId: 5 },
  { id: "comodato-fee", label: "Comodato", legacyGroupId: 7 },
] as const;

const LEGACY_ORDINARY_EXPENSE_ROWS = [
  { id: "expense-admin", label: "Gastos administración", budgetGroupId: 1 },
  { id: "expense-infrastructure", label: "Gastos de infraestructura", budgetGroupId: 4 },
  { id: "expense-maintenance", label: "Gastos de mantenimiento", budgetGroupId: 2 },
  { id: "expense-security", label: "Gastos de seguridad", budgetGroupId: 3 },
] as const;

const ORDINARY_BUDGET_GROUP_IDS = new Set<number>(
  LEGACY_ORDINARY_EXPENSE_ROWS.map((row) => row.budgetGroupId),
);

type LegacyOrdinaryIncomeRow = (typeof LEGACY_ORDINARY_INCOME_ROWS)[number];
type LegacyOrdinaryIncomeRowId = LegacyOrdinaryIncomeRow["id"];
type LegacyOrdinaryExpenseRow = (typeof LEGACY_ORDINARY_EXPENSE_ROWS)[number];
type LegacyOrdinaryExpenseRowId = LegacyOrdinaryExpenseRow["id"];

type LegacyOrdinaryOtherIncomeRow = {
  id: string;
  label: string;
  legacyMiscCatalogId: number;
};

type ExtendedChargeGroupKind = (typeof EXTENDED_CHARGE_KINDS)[number];

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

function toUtcYearRange(year: number): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)),
  };
}

function getMonth(date: Date): number {
  return date.getUTCMonth() + 1;
}

function normalizePeriodMonth(month: number): number | null {
  if (!Number.isFinite(month)) {
    return null;
  }

  const normalized = Math.trunc(month);
  return normalized >= 1 && normalized <= 12 ? normalized : null;
}

function resolveIncomeBucket(kind: ChargeGroupKind): IncomeBucket {
  if (kind === CHARGE_GROUP_KIND.ORDINARY) {
    return "ordinary";
  }

  if (EXTRAORDINARY_KINDS.has(kind)) {
    return "extraordinary";
  }

  return "other";
}

function yearFromDate(value: Date | null | undefined): number | null {
  return value ? value.getUTCFullYear() : null;
}

function buildAvailableYears(yearCandidates: Array<number | null>, requestedYear: number): number[] {
  const currentYear = new Date().getUTCFullYear();
  const minYear = 2020;
  const maxYear = currentYear + 1;

  const normalized = yearCandidates
    .filter((year): year is number => year !== null)
    .filter((year) => year >= minYear && year <= maxYear);

  const requested = Math.max(minYear, Math.min(maxYear, requestedYear));
  normalized.push(requested);

  const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => b - a);

  if (uniqueSorted.length === 0) {
    return [requested];
  }

  return uniqueSorted.slice(0, 8);
}

function createZeroSeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function createSeriesByKind(): Record<ExtendedChargeGroupKind, number[]> {
  return {
    [CHARGE_GROUP_KIND.ORDINARY]: createZeroSeries(),
    [CHARGE_GROUP_KIND.STC]: createZeroSeries(),
    [CHARGE_GROUP_KIND.SANCTION]: createZeroSeries(),
    [CHARGE_GROUP_KIND.COMODATO]: createZeroSeries(),
    [CHARGE_GROUP_KIND.EXTRA_CONDO]: createZeroSeries(),
    [CHARGE_GROUP_KIND.EXTRA_COMMERCE]: createZeroSeries(),
    [CHARGE_GROUP_KIND.OTHER]: createZeroSeries(),
  };
}

function addAmountToSeries(series: number[], month: number, amount: number): void {
  const monthIndex = month - 1;

  if (monthIndex < 0 || monthIndex >= 12) {
    return;
  }

  series[monthIndex] += amount;
}

function seriesAnnualTotal(series: number[]): number {
  return series.reduce((acc, value) => acc + value, 0);
}

function sumSeries(seriesList: number[][]): number[] {
  const output = createZeroSeries();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    output[monthIndex] = seriesList.reduce(
      (acc, series) => acc + (series[monthIndex] ?? 0),
      0,
    );
  }

  return output;
}

function subtractSeries(left: number[], right: number[]): number[] {
  const output = createZeroSeries();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    output[monthIndex] = (left[monthIndex] ?? 0) - (right[monthIndex] ?? 0);
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

function isLegacyVisiblePayment(detail: PaymentDetailSnapshot): boolean {
  const legacyStatusCode = detail.payment.legacyStatusCode ?? null;
  const isLegacyActive = detail.payment.isLegacyActive ?? null;
  const legacyAreaIsActive = detail.payment.legacyAreaIsActive ?? null;

  const hasLegacyFlags =
    legacyStatusCode !== null ||
    isLegacyActive !== null ||
    legacyAreaIsActive !== null;

  if (!hasLegacyFlags) {
    return true;
  }

  return (
    legacyStatusCode === 1 &&
    isLegacyActive === true &&
    legacyAreaIsActive === true
  );
}

function toYearSlice(year: number, series: number[]): FinancialSummaryYearSlice {
  return {
    year,
    months: series,
    annualTotal: seriesAnnualTotal(series),
  };
}

function toTableRow(
  id: string,
  label: string,
  series: number[],
  isTotal = false,
): FinancialSummaryTableRow {
  return {
    id,
    label,
    months: series,
    annualTotal: seriesAnnualTotal(series),
    isTotal,
  };
}

function resolveExtendedKind(kind: ChargeGroupKind): ExtendedChargeGroupKind {
  if ((EXTENDED_CHARGE_KINDS as readonly string[]).includes(kind)) {
    return kind as ExtendedChargeGroupKind;
  }

  return CHARGE_GROUP_KIND.OTHER;
}

function resolveExpenseBucket(expense: ExpenseSnapshot): ExpenseBucket {
  if (expense.legacyBudgetConceptId === 122) {
    return "extraordinary";
  }

  return "ordinary";
}

function initMonthlyRows(): FinancialSummaryMonth[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    ordinaryIncome: 0,
    extraordinaryIncome: 0,
    otherIncome: 0,
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  }));
}

async function loadCanonicalExpenseConceptGroups(
  condominiumId: string,
  years: number[],
): Promise<CanonicalExpenseConceptGroupSnapshot[]> {
  const maybeModel = (
    prisma as unknown as {
      expenseConceptGroupMap?: {
        findMany(args: unknown): Promise<CanonicalExpenseConceptGroupSnapshot[]>;
      };
    }
  ).expenseConceptGroupMap;

  if (maybeModel?.findMany) {
    return maybeModel.findMany({
      where: {
        condominiumId,
        year: { in: years },
      },
      select: {
        year: true,
        legacyBudgetConceptId: true,
        budgetGroupId: true,
      },
    });
  }

  const rows = await prisma.$queryRaw<CanonicalExpenseConceptGroupSnapshot[]>(Prisma.sql`
    SELECT
      year,
      legacy_budget_concept_id AS "legacyBudgetConceptId",
      budget_group_id AS "budgetGroupId"
    FROM expense_concept_group_map
    WHERE condominium_id = ${condominiumId}
      AND year IN (${Prisma.join(years)})
  `);

  return rows;
}

export class PrismaFinancialSummaryRepository implements FinancialSummaryRepository {
  async getSummary(input: FinancialSummaryInput): Promise<FinancialSummary | null> {
    const currentYear = new Date().getUTCFullYear();

    const requestedYear = Number.isFinite(input.year)
      ? Math.max(2020, Math.min(currentYear + 1, Math.trunc(input.year)))
      : currentYear;

    const condominium =
      (await prisma.condominium.findFirst({
        where: {
          isActive: true,
          slug: PROJECT_SCOPE.condominiumCode,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }));

    if (!condominium) {
      return null;
    }

    const range = toUtcYearRange(requestedYear);
    const nextYear = requestedYear + 1;
    const ordinaryExpenseYears = [requestedYear, nextYear] as const;
    const ordinaryExpenseComparisonRange = {
      from: new Date(Date.UTC(requestedYear, 0, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(nextYear + 1, 0, 1, 0, 0, 0, 0)),
    };
    const minLegacyYear = Math.min(...LEGACY_VISIBLE_YEARS);
    const maxLegacyYear = Math.max(...LEGACY_VISIBLE_YEARS);
    const legacyRange = {
      from: new Date(Date.UTC(minLegacyYear, 0, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(maxLegacyYear + 1, 0, 1, 0, 0, 0, 0)),
    };

    const [
      chargeGroups,
      miscIncomeCatalogs,
      paymentDetails,
      paymentDetailsForLegacyYears,
      incomes,
      incomesForLegacyYears,
      expenses,
      expensesForOrdinaryExpenseYears,
      paymentBounds,
      incomeBounds,
      expenseBounds,
      chargesForOrdinaryLedger,
      currentBudget,
      nextBudget,
    ] = await Promise.all([
      prisma.chargeGroup.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          name: true,
          chargeType: true,
        },
      }),
      prisma.miscIncomeCatalog.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          legacyChargeGroupId: 2,
          legacyId: { not: null },
        },
        orderBy: {
          legacyId: "asc",
        },
        select: {
          legacyId: true,
          name: true,
        },
      }),
      prisma.paymentDetail.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          payment: {
            paidAt: {
              gte: range.from,
              lt: range.to,
            },
          },
        },
        select: {
          amount: true,
          chargeGroupId: true,
          payment: {
            select: {
              paidAt: true,
              legacyStatusCode: true,
              isLegacyActive: true,
              legacyAreaIsActive: true,
            },
          },
        },
      }),
      prisma.paymentDetail.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          payment: {
            paidAt: {
              gte: legacyRange.from,
              lt: legacyRange.to,
            },
          },
        },
        select: {
          amount: true,
          chargeGroupId: true,
          payment: {
            select: {
              paidAt: true,
              legacyStatusCode: true,
              isLegacyActive: true,
              legacyAreaIsActive: true,
            },
          },
        },
      }),
      incomeModel.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          date: {
            gte: range.from,
            lt: range.to,
          },
        },
        select: {
          amount: true,
          date: true,
          legacyChargeGroupId: true,
          legacyMiscCatalogId: true,
        },
      }),
      incomeModel.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          date: {
            gte: legacyRange.from,
            lt: legacyRange.to,
          },
        },
        select: {
          amount: true,
          date: true,
          legacyChargeGroupId: true,
          legacyMiscCatalogId: true,
        },
      }),
      expenseModel.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          date: {
            gte: range.from,
            lt: range.to,
          },
        },
        select: {
          amount: true,
          date: true,
          concept: true,
          notes: true,
          legacyBudgetConceptId: true,
          legacyProjectName: true,
        },
      }),
      expenseModel.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          date: {
            gte: ordinaryExpenseComparisonRange.from,
            lt: ordinaryExpenseComparisonRange.to,
          },
        },
        select: {
          amount: true,
          date: true,
          concept: true,
          notes: true,
          legacyBudgetConceptId: true,
          legacyProjectName: true,
        },
      }),
      prisma.payment.aggregate({
        where: { condominiumId: condominium.id },
        _min: { paidAt: true },
        _max: { paidAt: true },
      }),
      incomeModel.aggregate({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        _min: { date: true },
        _max: { date: true },
      }),
      expenseModel.aggregate({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        _min: { date: true },
        _max: { date: true },
      }),
      prisma.charge.findMany({
        where: {
          condominiumId: condominium.id,
          isCollectible: true,
          status: { not: "CANCELED" },
          periodYear: {
            gte: Math.max(2000, requestedYear - 20),
            lte: nextYear,
          },
          privateArea: {
            isActive: true,
          },
          chargeGroup: {
            isActive: true,
          },
        },
        select: {
          amount: true,
          paidAmount: true,
          periodYear: true,
          periodMonth: true,
          chargeGroupId: true,
        },
      }),
      prisma.budget.findUnique({
        where: {
          condominiumId_year: {
            condominiumId: condominium.id,
            year: requestedYear,
          },
        },
        select: {
          lines: {
            select: {
              legacyId: true,
              months: {
                select: {
                  month: true,
                  amount: true,
                },
              },
            },
          },
        },
      }),
      prisma.budget.findUnique({
        where: {
          condominiumId_year: {
            condominiumId: condominium.id,
            year: nextYear,
          },
        },
        select: {
          lines: {
            select: {
              legacyId: true,
              months: {
                select: {
                  month: true,
                  amount: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const canonicalExpenseConceptGroups = await loadCanonicalExpenseConceptGroups(
      condominium.id,
      [...ordinaryExpenseYears],
    );

    const chargeGroupKindById = new Map<string, ChargeGroupKind>();
    const chargeGroupKindByLegacyId = new Map<number, ChargeGroupKind>();
    const chargeGroupLegacyIdById = new Map<string, number | null>();
    const monthlyByKind = createSeriesByKind();
    const extraordinaryExpenseSeries = createZeroSeries();
    const ordinaryExpenseSeries = createZeroSeries();
    const legacyOrdinaryRowByGroupId = new Map<number, LegacyOrdinaryIncomeRow>(
      LEGACY_ORDINARY_INCOME_ROWS.map((row) => [row.legacyGroupId, row]),
    );
    const ordinaryIncomeByRowAndYear = Object.fromEntries(
      LEGACY_ORDINARY_INCOME_ROWS.map((row) => [
        row.id,
        Object.fromEntries(LEGACY_VISIBLE_YEARS.map((year) => [year, createZeroSeries()])),
      ]),
    ) as Record<LegacyOrdinaryIncomeRowId, Record<number, number[]>>;
    const ordinaryOtherCatalogRows = (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
      .filter(
        (catalog): catalog is MiscIncomeCatalogSnapshot & { legacyId: number } =>
          catalog.legacyId !== null,
      )
      .map((catalog) => ({
        id: `ordinary-other-${catalog.legacyId}`,
        label: catalog.name,
        legacyMiscCatalogId: catalog.legacyId,
      })) as LegacyOrdinaryOtherIncomeRow[];
    const ordinaryOtherRowByLegacyMiscId = new Map<number, LegacyOrdinaryOtherIncomeRow>(
      ordinaryOtherCatalogRows.map((row) => [row.legacyMiscCatalogId, row]),
    );
    const ordinaryOtherIncomeByRowAndYear = new Map<string, Record<number, number[]>>(
      ordinaryOtherCatalogRows.map((row) => [
        row.id,
        Object.fromEntries(LEGACY_VISIBLE_YEARS.map((year) => [year, createZeroSeries()])),
      ]),
    );
    const ordinaryExpenseRowByBudgetGroupId = new Map<number, LegacyOrdinaryExpenseRow>(
      LEGACY_ORDINARY_EXPENSE_ROWS.map((row) => [row.budgetGroupId, row]),
    );
    const budgetGroupByLegacyConceptByYear = new Map<number, Map<number, number>>(
      ordinaryExpenseYears.map((year) => [year, new Map<number, number>()]),
    );
    const ordinaryExpenseByRowAndYear = Object.fromEntries(
      LEGACY_ORDINARY_EXPENSE_ROWS.map((row) => [
        row.id,
        Object.fromEntries(ordinaryExpenseYears.map((year) => [year, createZeroSeries()])),
      ]),
    ) as Record<LegacyOrdinaryExpenseRowId, Record<number, number[]>>;

    for (const group of chargeGroups as ChargeGroupSnapshot[]) {
      const kind = resolveChargeGroupKind(group);
      chargeGroupKindById.set(group.id, kind);
      chargeGroupLegacyIdById.set(group.id, group.legacyId);

      if (group.legacyId !== null) {
        chargeGroupKindByLegacyId.set(group.legacyId, kind);
      }
    }

    for (const mapping of canonicalExpenseConceptGroups) {
      const yearMap = budgetGroupByLegacyConceptByYear.get(mapping.year);
      if (!yearMap) {
        continue;
      }

      if (yearMap.has(mapping.legacyBudgetConceptId)) {
        continue;
      }

      yearMap.set(mapping.legacyBudgetConceptId, mapping.budgetGroupId);
    }

    const requestedYearExpenseConceptMap =
      budgetGroupByLegacyConceptByYear.get(requestedYear) ?? new Map<number, number>();
    const nextYearExpenseConceptMap =
      budgetGroupByLegacyConceptByYear.get(nextYear) ?? new Map<number, number>();

    const ordinaryChargeGroupIdByLegacyGroupId = new Map<number, string>();
    for (const group of chargeGroups as ChargeGroupSnapshot[]) {
      if (group.legacyId === null) {
        continue;
      }

      if (!legacyOrdinaryRowByGroupId.has(group.legacyId)) {
        continue;
      }

      ordinaryChargeGroupIdByLegacyGroupId.set(group.legacyId, group.id);
    }

    const receivableRowsById = new Map<string, {
      id: string;
      label: string;
      periodCurrentYear: number;
      periodNextYear: number;
      monthsCurrentYear: number[];
      monthsNextYear: number[];
    }>(
      LEGACY_ORDINARY_INCOME_ROWS.map((row) => [
        row.id,
        {
          id: row.id,
          label: row.label,
          periodCurrentYear: 0,
          periodNextYear: 0,
          monthsCurrentYear: createZeroSeries(),
          monthsNextYear: createZeroSeries(),
        },
      ]),
    );

    const payableBudgetCurrentSeries = createZeroSeries();
    const payableBudgetNextSeries = createZeroSeries();

    const monthly = initMonthlyRows();

    for (const detail of paymentDetails as PaymentDetailSnapshot[]) {
      if (!isLegacyVisiblePayment(detail)) {
        continue;
      }

      const month = getMonth(detail.payment.paidAt);
      const row = monthly[month - 1];
      const amount = decimalToNumber(detail.amount);
      const kind = detail.chargeGroupId
        ? (chargeGroupKindById.get(detail.chargeGroupId) ?? CHARGE_GROUP_KIND.OTHER)
        : CHARGE_GROUP_KIND.OTHER;
      const extendedKind = resolveExtendedKind(kind);
      const bucket = resolveIncomeBucket(kind);

      addAmountToSeries(monthlyByKind[extendedKind], month, amount);

      if (bucket === "ordinary") {
        row.ordinaryIncome += amount;
      } else if (bucket === "extraordinary") {
        row.extraordinaryIncome += amount;
      } else {
        row.otherIncome += amount;
      }
    }

    for (const detail of paymentDetailsForLegacyYears as PaymentDetailSnapshot[]) {
      const year = detail.payment.paidAt.getUTCFullYear();

      if (!LEGACY_VISIBLE_YEARS.includes(year as (typeof LEGACY_VISIBLE_YEARS)[number])) {
        continue;
      }

      if (detail.payment.legacyStatusCode !== 1) {
        continue;
      }

      if (detail.payment.isLegacyActive !== true) {
        continue;
      }

      if (detail.payment.legacyAreaIsActive !== true) {
        continue;
      }

      if (!detail.chargeGroupId) {
        continue;
      }

      const legacyGroupId = chargeGroupLegacyIdById.get(detail.chargeGroupId) ?? null;
      if (legacyGroupId === null) {
        continue;
      }

      const legacyRow = legacyOrdinaryRowByGroupId.get(legacyGroupId);
      if (!legacyRow) {
        continue;
      }

      const month = getMonth(detail.payment.paidAt);
      const amount = decimalToNumber(detail.amount);

      addAmountToSeries(ordinaryIncomeByRowAndYear[legacyRow.id][year], month, amount);
    }

    for (const income of incomes) {
      const month = getMonth(income.date);
      const row = monthly[month - 1];
      const amount = decimalToNumber(income.amount);
      const kind = income.legacyChargeGroupId !== null
        ? (chargeGroupKindByLegacyId.get(income.legacyChargeGroupId) ?? CHARGE_GROUP_KIND.OTHER)
        : CHARGE_GROUP_KIND.OTHER;
      const extendedKind = resolveExtendedKind(kind);
      const bucket = resolveIncomeBucket(kind);

      addAmountToSeries(monthlyByKind[extendedKind], month, amount);

      if (bucket === "ordinary") {
        row.ordinaryIncome += amount;
      } else if (bucket === "extraordinary") {
        row.extraordinaryIncome += amount;
      } else {
        row.otherIncome += amount;
      }
    }

    for (const income of incomesForLegacyYears as IncomeSnapshot[]) {
      const year = income.date.getUTCFullYear();

      if (!LEGACY_VISIBLE_YEARS.includes(year as (typeof LEGACY_VISIBLE_YEARS)[number])) {
        continue;
      }

      if (income.legacyMiscCatalogId === null) {
        continue;
      }

      if (income.legacyChargeGroupId !== null && income.legacyChargeGroupId !== 0) {
        continue;
      }

      const row = ordinaryOtherRowByLegacyMiscId.get(income.legacyMiscCatalogId);
      if (!row) {
        continue;
      }

      const byYear = ordinaryOtherIncomeByRowAndYear.get(row.id);
      if (!byYear) {
        continue;
      }

      const month = getMonth(income.date);
      const amount = decimalToNumber(income.amount);

      addAmountToSeries(byYear[year], month, amount);
    }

    for (const expense of expenses) {
      const month = getMonth(expense.date);
      const row = monthly[month - 1];
      const amount = decimalToNumber(expense.amount);

      row.totalExpenses += amount;

      if (expense.legacyBudgetConceptId === 122) {
        addAmountToSeries(extraordinaryExpenseSeries, month, amount);
        continue;
      }

      if (expense.legacyBudgetConceptId === null) {
        continue;
      }

      const budgetGroupId = requestedYearExpenseConceptMap.get(expense.legacyBudgetConceptId);
      if (budgetGroupId === undefined) {
        continue;
      }

      if (!ordinaryExpenseRowByBudgetGroupId.has(budgetGroupId)) {
        continue;
      }

      {
        addAmountToSeries(ordinaryExpenseSeries, month, amount);
      }
    }

    for (const expense of expensesForOrdinaryExpenseYears as ExpenseSnapshot[]) {
      const year = expense.date.getUTCFullYear();
      if (!ordinaryExpenseYears.includes(year as (typeof ordinaryExpenseYears)[number])) {
        continue;
      }

      if (resolveExpenseBucket(expense) !== "ordinary") {
        continue;
      }

      if (expense.legacyBudgetConceptId === null) {
        continue;
      }

      const yearMap = budgetGroupByLegacyConceptByYear.get(year);
      if (!yearMap) {
        continue;
      }

      const budgetGroupId = yearMap.get(expense.legacyBudgetConceptId);
      if (budgetGroupId === undefined) {
        continue;
      }

      const rowMeta = ordinaryExpenseRowByBudgetGroupId.get(budgetGroupId);
      if (!rowMeta) {
        continue;
      }

      const month = getMonth(expense.date);
      const amount = decimalToNumber(expense.amount);
      addAmountToSeries(ordinaryExpenseByRowAndYear[rowMeta.id][year], month, amount);
    }

    const ordinaryChargeGroupIds = new Set(ordinaryChargeGroupIdByLegacyGroupId.values());
    let overduePortfolioTotal = 0;
    let minOverdueYear: number | null = null;

    for (const charge of chargesForOrdinaryLedger as ChargeLedgerSnapshot[]) {
      if (!ordinaryChargeGroupIds.has(charge.chargeGroupId)) {
        continue;
      }

      const outstandingAmount =
        decimalToNumber(charge.amount) - decimalToNumber(charge.paidAmount);
      if (outstandingAmount <= 0) {
        continue;
      }

      const legacyGroupId = chargeGroupLegacyIdById.get(charge.chargeGroupId) ?? null;
      if (legacyGroupId === null) {
        continue;
      }

      const rowMeta = legacyOrdinaryRowByGroupId.get(legacyGroupId);
      if (!rowMeta) {
        continue;
      }

      const rowState = receivableRowsById.get(rowMeta.id);
      if (!rowState) {
        continue;
      }

      const normalizedMonth = normalizePeriodMonth(charge.periodMonth);

      if (charge.periodYear === requestedYear) {
        rowState.periodCurrentYear += outstandingAmount;
        if (normalizedMonth !== null) {
          addAmountToSeries(rowState.monthsCurrentYear, normalizedMonth, outstandingAmount);
        }
        continue;
      }

      if (charge.periodYear === nextYear) {
        rowState.periodNextYear += outstandingAmount;
        if (normalizedMonth !== null) {
          addAmountToSeries(rowState.monthsNextYear, normalizedMonth, outstandingAmount);
        }
        continue;
      }

      if (charge.periodYear < requestedYear) {
        overduePortfolioTotal += outstandingAmount;
        minOverdueYear =
          minOverdueYear === null
            ? charge.periodYear
            : Math.min(minOverdueYear, charge.periodYear);
      }
    }

    const addBudgetSeries = (
      budgetSnapshot: BudgetSnapshot | null,
      conceptMap: Map<number, number>,
      outputSeries: number[],
    ): void => {
      if (!budgetSnapshot) {
        return;
      }

      for (const line of budgetSnapshot.lines) {
        if (line.legacyId === null) {
          continue;
        }

        const budgetGroupId = conceptMap.get(line.legacyId);
        if (budgetGroupId === undefined || !ORDINARY_BUDGET_GROUP_IDS.has(budgetGroupId)) {
          continue;
        }

        for (const month of line.months) {
          const normalizedMonth = normalizePeriodMonth(month.month);
          if (normalizedMonth === null) {
            continue;
          }

          addAmountToSeries(outputSeries, normalizedMonth, decimalToNumber(month.amount));
        }
      }
    };

    addBudgetSeries(currentBudget as BudgetSnapshot | null, requestedYearExpenseConceptMap, payableBudgetCurrentSeries);
    addBudgetSeries(nextBudget as BudgetSnapshot | null, nextYearExpenseConceptMap, payableBudgetNextSeries);
    const payableCurrentSeries = payableBudgetCurrentSeries;
    const payableNextSeries = payableBudgetNextSeries;

    let ordinaryTotal = 0;
    let extraordinaryTotal = 0;
    let otherTotal = 0;
    let incomeTotal = 0;
    let expenseTotal = 0;

    for (const row of monthly) {
      row.totalIncome = row.ordinaryIncome + row.extraordinaryIncome + row.otherIncome;
      row.balance = row.totalIncome - row.totalExpenses;

      ordinaryTotal += row.ordinaryIncome;
      extraordinaryTotal += row.extraordinaryIncome;
      otherTotal += row.otherIncome;
      incomeTotal += row.totalIncome;
      expenseTotal += row.totalExpenses;
    }

    const paymentDateBounds = paymentBounds as PaymentDateAggregateResult;

    const availableYears = buildAvailableYears(
      [
        yearFromDate(paymentDateBounds._min.paidAt),
        yearFromDate(paymentDateBounds._max.paidAt),
        yearFromDate(incomeBounds._min?.date),
        yearFromDate(incomeBounds._max?.date),
        yearFromDate(expenseBounds._min?.date),
        yearFromDate(expenseBounds._max?.date),
      ],
      requestedYear,
    );

    const ordinaryIncomeSeries = sumSeries([
      monthlyByKind[CHARGE_GROUP_KIND.ORDINARY],
      monthlyByKind[CHARGE_GROUP_KIND.STC],
      monthlyByKind[CHARGE_GROUP_KIND.SANCTION],
      monthlyByKind[CHARGE_GROUP_KIND.COMODATO],
    ]);

    const requestedYearIsLegacyVisible = LEGACY_VISIBLE_YEARS.includes(
      requestedYear as (typeof LEGACY_VISIBLE_YEARS)[number],
    );
    const ordinaryOtherSeriesByRowForRequestedYear = new Map<string, number[]>(
      ordinaryOtherCatalogRows.map((row) => {
        const byYear = ordinaryOtherIncomeByRowAndYear.get(row.id);
        return [
          row.id,
          requestedYearIsLegacyVisible
            ? (byYear?.[requestedYear] ?? createZeroSeries())
            : createZeroSeries(),
        ];
      }),
    );

    if (!requestedYearIsLegacyVisible) {
      for (const income of incomes as IncomeSnapshot[]) {
        if (income.legacyMiscCatalogId === null) {
          continue;
        }

        if (income.legacyChargeGroupId !== null && income.legacyChargeGroupId !== 0) {
          continue;
        }

        const row = ordinaryOtherRowByLegacyMiscId.get(income.legacyMiscCatalogId);
        if (!row) {
          continue;
        }

        const month = getMonth(income.date);
        const amount = decimalToNumber(income.amount);
        const series = ordinaryOtherSeriesByRowForRequestedYear.get(row.id);

        if (!series) {
          continue;
        }

        addAmountToSeries(series, month, amount);
      }
    }

    const ordinaryOtherSeriesList = ordinaryOtherCatalogRows.map(
      (row) => ordinaryOtherSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
    );
    const ordinaryOtherIncomeSeries =
      ordinaryOtherSeriesList.length > 0
        ? sumSeries(ordinaryOtherSeriesList)
        : monthlyByKind[CHARGE_GROUP_KIND.OTHER];
    const ordinaryTotalIncomeSeries = sumSeries([
      ordinaryIncomeSeries,
      ordinaryOtherIncomeSeries,
    ]);
    const ordinaryBalanceSeries = subtractSeries(
      ordinaryTotalIncomeSeries,
      ordinaryExpenseSeries,
    );
    const ordinaryBanksCashSeries = cumulativeSeries(ordinaryBalanceSeries);

    const extraordinaryIncomeSeries = sumSeries([
      monthlyByKind[CHARGE_GROUP_KIND.EXTRA_CONDO],
      monthlyByKind[CHARGE_GROUP_KIND.EXTRA_COMMERCE],
    ]);

    const extraordinaryOtherIncomeSeries = createZeroSeries();
    const extraordinaryTotalIncomeSeries = sumSeries([
      extraordinaryIncomeSeries,
      extraordinaryOtherIncomeSeries,
    ]);
    const extraordinaryBalanceSeries = subtractSeries(
      extraordinaryTotalIncomeSeries,
      extraordinaryExpenseSeries,
    );
    const extraordinaryBanksCashSeries = cumulativeSeries(extraordinaryBalanceSeries);

    const blocks: FinancialSummaryBlock[] = [
      {
        id: "ordinary",
        title: "Balance de Cuotas Ordinarias",
        tables: [
          {
            id: "ordinary-income",
            title: "Ingresos mensuales",
            rows: [
              toTableRow("ordinary-fee", "Cuotas ordinarias", monthlyByKind[CHARGE_GROUP_KIND.ORDINARY]),
              toTableRow("stc-fee", "Cuotas STC", monthlyByKind[CHARGE_GROUP_KIND.STC]),
              toTableRow("sanction-fee", "Sancion", monthlyByKind[CHARGE_GROUP_KIND.SANCTION]),
              toTableRow("comodato-fee", "Comodato", monthlyByKind[CHARGE_GROUP_KIND.COMODATO]),
              toTableRow("ordinary-income-total", "Total", ordinaryIncomeSeries, true),
            ],
          },
          {
            id: "ordinary-other-income",
            title: "Otros ingresos",
            rows:
              ordinaryOtherCatalogRows.length > 0
                ? [
                    ...ordinaryOtherCatalogRows.map((row) =>
                      toTableRow(
                        row.id,
                        row.label,
                        ordinaryOtherSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
                      ),
                    ),
                    toTableRow("ordinary-other-total", "Total", ordinaryOtherIncomeSeries, true),
                  ]
                : [
                    toTableRow("ordinary-other", "Otros ingresos", ordinaryOtherIncomeSeries),
                    toTableRow("ordinary-other-total", "Total", ordinaryOtherIncomeSeries, true),
                  ],
          },
          {
            id: "ordinary-expenses",
            title: "Egresos mensuales",
            rows: [
              toTableRow("ordinary-expense", "Egresos ordinarios", ordinaryExpenseSeries),
              toTableRow("ordinary-expense-total", "Total", ordinaryExpenseSeries, true),
            ],
          },
          {
            id: "ordinary-balance",
            title: "Saldo Ingresos - Egresos Ordinarios",
            rows: [
              toTableRow("ordinary-balance-total", "Total", ordinaryBalanceSeries, true),
              toTableRow("ordinary-banks-cash", "Bancos y caja", ordinaryBanksCashSeries),
            ],
          },
        ],
      },
      {
        id: "extraordinary",
        title: "Balance de Cuotas Extraordinarias",
        tables: [
          {
            id: "extraordinary-income",
            title: "Ingresos mensuales",
            rows: [
              toTableRow(
                "extra-condo",
                "Cuotas extraordinarias - Condominos",
                monthlyByKind[CHARGE_GROUP_KIND.EXTRA_CONDO],
              ),
              toTableRow(
                "extra-commerce",
                "Cuota extraordinaria - Comercios",
                monthlyByKind[CHARGE_GROUP_KIND.EXTRA_COMMERCE],
              ),
              toTableRow("extra-income-total", "Total", extraordinaryIncomeSeries, true),
            ],
          },
          {
            id: "extraordinary-other-income",
            title: "Otros ingresos",
            rows: [
              toTableRow(
                "extra-other",
                "Otros ingresos extraordinarios",
                extraordinaryOtherIncomeSeries,
              ),
              toTableRow(
                "extra-other-total",
                "Total",
                extraordinaryOtherIncomeSeries,
                true,
              ),
            ],
          },
          {
            id: "extraordinary-expenses",
            title: "Egresos mensuales",
            rows: [
              toTableRow(
                "extra-expense",
                "Egresos extraordinarios",
                extraordinaryExpenseSeries,
              ),
              toTableRow(
                "extra-expense-total",
                "Total",
                extraordinaryExpenseSeries,
                true,
              ),
            ],
          },
          {
            id: "extraordinary-balance",
            title: "Saldo Ingresos - Egresos Extraordinarios",
            rows: [
              toTableRow("extra-balance-total", "Total", extraordinaryBalanceSeries, true),
              toTableRow("extra-banks-cash", "Bancos y caja", extraordinaryBanksCashSeries),
            ],
          },
        ],
      },
    ];

    const ordinaryIncomeMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "ordinary-income-multi-year",
      title: "Ingresos mensuales",
      years: [...LEGACY_VISIBLE_YEARS],
      rows: [
        ...LEGACY_ORDINARY_INCOME_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          yearly: LEGACY_VISIBLE_YEARS.map((year) =>
            toYearSlice(year, ordinaryIncomeByRowAndYear[row.id][year]),
          ),
        })),
        {
          id: "ordinary-income-total",
          label: "Total",
          isTotal: true,
          yearly: LEGACY_VISIBLE_YEARS.map((year) =>
            toYearSlice(
              year,
              sumSeries([
                ...LEGACY_ORDINARY_INCOME_ROWS.map((row) => ordinaryIncomeByRowAndYear[row.id][year]),
              ]),
            ),
          ),
        },
      ],
    };

    const ordinaryOtherIncomeMultiYearRows =
      ordinaryOtherCatalogRows.length > 0
        ? ordinaryOtherCatalogRows.map((row) => ({
            id: row.id,
            label: row.label,
            yearly: LEGACY_VISIBLE_YEARS.map((year) =>
              toYearSlice(year, ordinaryOtherIncomeByRowAndYear.get(row.id)?.[year] ?? createZeroSeries()),
            ),
          }))
        : [
            {
              id: "ordinary-other",
              label: "Otros ingresos",
              yearly: LEGACY_VISIBLE_YEARS.map((year) => toYearSlice(year, createZeroSeries())),
            },
          ];

    const ordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "ordinary-other-income-multi-year",
      title: "Otros ingresos",
      years: [...LEGACY_VISIBLE_YEARS],
      rows: [
        ...ordinaryOtherIncomeMultiYearRows,
        {
          id: "ordinary-other-total",
          label: "Total",
          isTotal: true,
          yearly: LEGACY_VISIBLE_YEARS.map((year) =>
            toYearSlice(
              year,
              sumSeries(
                ordinaryOtherIncomeMultiYearRows.map(
                  (row) => row.yearly.find((slice) => slice.year === year)?.months ?? createZeroSeries(),
                ),
              ),
            ),
          ),
        },
      ],
    };

    const ordinaryExpensesLegacyTable: FinancialSummaryMultiYearTable = {
      id: "ordinary-expenses-legacy-multi-year",
      title: "Egresos mensuales",
      years: [...ordinaryExpenseYears],
      rows: [
        ...LEGACY_ORDINARY_EXPENSE_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          yearly: ordinaryExpenseYears.map((year) =>
            toYearSlice(year, ordinaryExpenseByRowAndYear[row.id][year]),
          ),
        })),
        {
          id: "ordinary-expenses-legacy-total",
          label: "Total",
          isTotal: true,
          yearly: ordinaryExpenseYears.map((year) =>
            toYearSlice(
              year,
              sumSeries(
                LEGACY_ORDINARY_EXPENSE_ROWS.map(
                  (row) => ordinaryExpenseByRowAndYear[row.id][year],
                ),
              ),
            ),
          ),
        },
      ],
    };

    const ordinaryReceivableRows: FinancialSummaryOrdinaryReceivableRow[] =
      LEGACY_ORDINARY_INCOME_ROWS.map((row) => {
        const rowState = receivableRowsById.get(row.id);

        return {
          id: row.id,
          label: row.label,
          periodCurrentYear: rowState?.periodCurrentYear ?? 0,
          overduePortfolio: null,
          monthsCurrentYear: rowState?.monthsCurrentYear ?? createZeroSeries(),
          periodNextYear: rowState?.periodNextYear ?? 0,
          monthsNextYear: rowState?.monthsNextYear ?? createZeroSeries(),
        };
      });

    const receivableTotalCurrentSeries = sumSeries(
      ordinaryReceivableRows.map((row) => row.monthsCurrentYear),
    );
    const receivableTotalNextSeries = sumSeries(
      ordinaryReceivableRows.map((row) => row.monthsNextYear),
    );

    const overdueEndYear = requestedYear - 1;
    const fallbackOverdueStartYear = Math.max(2017, requestedYear - 8);
    const resolvedOverdueStartYear =
      minOverdueYear === null ? fallbackOverdueStartYear : minOverdueYear;
    const overdueStartYear = Math.min(resolvedOverdueStartYear, overdueEndYear);

    const ordinaryReceivablesTable: FinancialSummaryOrdinaryReceivableTable = {
      id: "ordinary-receivables",
      title: "Cuentas por cobrar - Ingresos Cuotas Ordinarias",
      currentYear: requestedYear,
      nextYear,
      overdueStartYear,
      overdueEndYear,
      rows: [
        ...ordinaryReceivableRows,
        {
          id: "ordinary-receivables-total",
          label: "Total",
          periodCurrentYear: seriesAnnualTotal(receivableTotalCurrentSeries),
          overduePortfolio: overduePortfolioTotal,
          monthsCurrentYear: receivableTotalCurrentSeries,
          periodNextYear: seriesAnnualTotal(receivableTotalNextSeries),
          monthsNextYear: receivableTotalNextSeries,
          isTotal: true,
        },
      ],
    };

    const ordinaryPayableRows: FinancialSummaryOrdinaryPayableRow[] = [
      {
        id: "ordinary-payable",
        label: "Cuotas ordinarias",
        periodCurrentYear: seriesAnnualTotal(payableCurrentSeries),
        monthsCurrentYear: payableCurrentSeries,
        totalAnnualNextYear: seriesAnnualTotal(payableNextSeries),
        periodNextYear: seriesAnnualTotal(payableNextSeries),
        monthsNextYear: payableNextSeries,
      },
    ];

    const ordinaryPayablesTable: FinancialSummaryOrdinaryPayableTable = {
      id: "ordinary-payables",
      title: "Cuentas por pagar - Egresos Cuotas Ordinarias",
      currentYear: requestedYear,
      nextYear,
      rows: ordinaryPayableRows,
    };

    return {
      condominiumName: condominium.name,
      condominiumSlug: condominium.slug,
      year: requestedYear,
      availableYears,
      months: monthly,
      totals: {
        ordinaryIncome: ordinaryTotal,
        extraordinaryIncome: extraordinaryTotal,
        otherIncome: otherTotal,
        totalIncome: incomeTotal,
        totalExpenses: expenseTotal,
        annualBalance: incomeTotal - expenseTotal,
      },
      blocks,
      ordinaryIncomeMultiYearTable,
      ordinaryOtherIncomeMultiYearTable,
      ordinaryExpensesLegacyTable,
      ordinaryReceivablesTable,
      ordinaryPayablesTable,
      generatedAt: new Date(),
    };
  }
}
