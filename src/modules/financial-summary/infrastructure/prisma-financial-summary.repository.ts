import { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import {
  CHARGE_GROUP_KIND,
  type ChargeGroupKind,
} from "@/shared/domain/charge-group-kind";
import {
  BUDGET_EXPENSE_GROUP,
  ORDINARY_BUDGET_EXPENSE_GROUPS,
  type BudgetExpenseGroup,
} from "@/shared/domain/budget-expense-group";
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
  kind: ChargeGroupKind;
};

type PaymentDetailSnapshot = {
  amount: Prisma.Decimal | number;
  chargeGroupId: string | null;
  payment: {
    paidAt: Date;
    isVisibleInFinancialSummary?: boolean | null;
    method: string | null;
  };
};

type IncomeSnapshot = {
  amount: Prisma.Decimal | number;
  date: Date;
  chargeGroupId: string | null;
  miscCatalogId: string | null;
  paymentMethod: string | null;
};

type MiscIncomeCatalogSnapshot = {
  id: string;
  name: string;
  order: number;
  quotaPeriodStart: Date | null;
  quotaPeriodEnd: Date | null;
  chargeGroup: {
    kind: ChargeGroupKind;
  } | null;
};

type ExpenseSnapshot = {
  amount: Prisma.Decimal | number;
  date: Date;
  concept: string;
  notes: string | null;
  legacyProjectName: string | null;
  paymentMethod: string | null;
  budgetConcept: {
    year: number;
    name: string;
    budgetGroup: BudgetExpenseGroup;
    legacyBudgetConceptId: number | null;
    isActive: boolean;
    group?: {
      category: string;
      parent?: {
        category: string;
      } | null;
    } | null;
  } | null;
};

type ChargeLedgerSnapshot = {
  amount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
  periodYear: number;
  periodMonth: number;
  chargeGroupId: string;
  status: "OPEN" | "PARTIAL" | "PAID" | "CANCELED";
};

type BudgetMonthSnapshot = {
  month: number;
  amount: Prisma.Decimal | number;
};

type BudgetLineSnapshot = {
  concept: string;
  budgetConcept: {
    budgetGroup: BudgetExpenseGroup;
    isActive: boolean;
    group?: {
      category: string;
      parent?: {
        category: string;
      } | null;
    } | null;
  } | null;
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

const CATEGORY_MAP: Record<string, string> = {
  'Gastos administración': 'ADMINISTRATION',
  'Gastos de mantenimiento': 'MAINTENANCE',
  'Gastos de seguridad': 'SECURITY',
  'Gastos de infraestructura': 'INFRASTRUCTURE',
  'Gastos extraordinarios': 'EXTRAORDINARY',
  'Gastos mantenimiento': 'MAINTENANCE',
  'Gastos seguridad': 'SECURITY',
  'Gastos infraestructura': 'INFRASTRUCTURE',
  'Gastos administración ordinarios': 'ADMINISTRATION',
  'Gastos administración ordinario': 'ADMINISTRATION'
};

function resolveBudgetGroup(concept: {
  budgetGroup: string;
  group?: {
    category: string;
    parent?: {
      category: string;
    } | null;
  } | null;
} | null | undefined): string {
  if (!concept) return 'OTHER';
  if (concept.budgetGroup && concept.budgetGroup !== 'OTHER') {
    return concept.budgetGroup;
  }
  const category = concept.group?.category || concept.group?.parent?.category;
  if (category && CATEGORY_MAP[category]) {
    return CATEGORY_MAP[category];
  }
  return concept.budgetGroup || 'OTHER';
}


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

const REPORT_VISIBLE_YEARS = [2024, 2025, 2026] as const;

const ORDINARY_RECEIVABLE_ROWS = [
  { id: "ordinary-fee", label: "Cuotas ordinarias", kind: CHARGE_GROUP_KIND.ORDINARY },
  { id: "stc-fee", label: "Cuotas STC", kind: CHARGE_GROUP_KIND.STC },
  { id: "sanction-fee", label: "Sancion", kind: CHARGE_GROUP_KIND.SANCTION },
  { id: "comodato-fee", label: "Comodato", kind: CHARGE_GROUP_KIND.COMODATO },
] as const;

const EXTRAORDINARY_INCOME_ROWS = [
  {
    id: "extra-condo",
    label: "Cuotas extraordinarias - Condominos",
    kind: CHARGE_GROUP_KIND.EXTRA_CONDO,
  },
  {
    id: "extra-commerce",
    label: "Cuota extraordinaria - Comercios",
    kind: CHARGE_GROUP_KIND.EXTRA_COMMERCE,
  },
] as const;

const EXTRAORDINARY_OTHER_INCOME_KINDS = new Set<ChargeGroupKind>([
  CHARGE_GROUP_KIND.EXTRA_CONDO,
  CHARGE_GROUP_KIND.EXTRA_COMMERCE,
]);

const ORDINARY_EXPENSE_ROWS = [
  {
    id: "expense-admin",
    label: "Gastos administración",
    budgetGroup: BUDGET_EXPENSE_GROUP.ADMINISTRATION,
  },
  {
    id: "expense-infrastructure",
    label: "Gastos de infraestructura",
    budgetGroup: BUDGET_EXPENSE_GROUP.INFRASTRUCTURE,
  },
  {
    id: "expense-maintenance",
    label: "Gastos de mantenimiento",
    budgetGroup: BUDGET_EXPENSE_GROUP.MAINTENANCE,
  },
  {
    id: "expense-security",
    label: "Gastos de seguridad",
    budgetGroup: BUDGET_EXPENSE_GROUP.SECURITY,
  },
] as const;

type OrdinaryReceivableRowConfig = (typeof ORDINARY_RECEIVABLE_ROWS)[number];
type OrdinaryReceivableRowId = OrdinaryReceivableRowConfig["id"];
type ExtraordinaryIncomeRowConfig = (typeof EXTRAORDINARY_INCOME_ROWS)[number];
type ExtraordinaryIncomeRowId = ExtraordinaryIncomeRowConfig["id"];
type OrdinaryExpenseRow = (typeof ORDINARY_EXPENSE_ROWS)[number];
type OrdinaryExpenseRowId = OrdinaryExpenseRow["id"];

type OtherIncomeCatalogRow = {
  id: string;
  label: string;
  miscCatalogId: string;
};

type ExtraordinaryExpenseConceptRow = {
  id: string;
  label: string;
  legacyBudgetConceptId: number;
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

function isConceptFallbackName(name: string): boolean {
  return /^concepto\s+\d+$/i.test(name.trim());
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

function isExtraordinaryBudgetGroup(group: { name: string; category: string }): boolean {
  return (
    group.name.toLowerCase().includes("extraordinario") ||
    group.category.toLowerCase().includes("extraordinario")
  );
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

function isPaymentVisibleInFinancialSummary(detail: PaymentDetailSnapshot): boolean {
  const isVisibleInFinancialSummary = detail.payment.isVisibleInFinancialSummary ?? null;

  if (isVisibleInFinancialSummary === null) {
    return true;
  }

  return isVisibleInFinancialSummary;
}

function toYearSlice(year: number, series: number[]): FinancialSummaryYearSlice {
  return {
    year,
    months: series,
    annualTotal: seriesAnnualTotal(series),
  };
}

function toYearSliceWithPeriodEndTotal(year: number, series: number[]): FinancialSummaryYearSlice {
  return {
    year,
    months: series,
    annualTotal: series[11] ?? 0,
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

function toTableRowWithPeriodEndTotal(
  id: string,
  label: string,
  series: number[],
  isTotal = false,
): FinancialSummaryTableRow {
  return {
    id,
    label,
    months: series,
    annualTotal: series[11] ?? 0,
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
  if (resolveBudgetGroup(expense.budgetConcept) === BUDGET_EXPENSE_GROUP.EXTRAORDINARY) {
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
    const visibleYears = [requestedYear, nextYear];
    const ordinaryExpenseYears = [requestedYear, nextYear] as const;
    const ordinaryExpenseComparisonRange = {
      from: new Date(Date.UTC(requestedYear, 0, 1, 0, 0, 0, 0)),
      to: new Date(Date.UTC(nextYear + 1, 0, 1, 0, 0, 0, 0)),
    };
    const minLegacyYear = Math.min(...visibleYears);
    const maxLegacyYear = Math.max(...visibleYears);
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
      expensesForLegacyYears,
      extraordinaryBudgetConcepts,
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
          kind: true,
        },
      }),
      prisma.miscIncomeCatalog.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          chargeGroupId: { not: null },
        },
        orderBy: [
          { order: "asc" },
          { quotaPeriodStart: "asc" },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          order: true,
          quotaPeriodStart: true,
          quotaPeriodEnd: true,
          chargeGroup: {
            select: {
              kind: true,
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
              isVisibleInFinancialSummary: true,
              method: true,
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
              isVisibleInFinancialSummary: true,
              method: true,
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
          chargeGroupId: true,
          miscCatalogId: true,
          paymentMethod: true,
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
          chargeGroupId: true,
          miscCatalogId: true,
          paymentMethod: true,
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
          legacyProjectName: true,
          paymentMethod: true,
          budgetConcept: {
            select: {
              year: true,
              name: true,
              budgetGroup: true,
              legacyBudgetConceptId: true,
              isActive: true,
              group: {
                select: {
                  category: true,
                  parent: {
                    select: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
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
          legacyProjectName: true,
          paymentMethod: true,
          budgetConcept: {
            select: {
              year: true,
              name: true,
              budgetGroup: true,
              legacyBudgetConceptId: true,
              isActive: true,
              group: {
                select: {
                  category: true,
                  parent: {
                    select: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      expenseModel.findMany({
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
          concept: true,
          notes: true,
          legacyProjectName: true,
          paymentMethod: true,
          budgetConcept: {
            select: {
              year: true,
              name: true,
              budgetGroup: true,
              legacyBudgetConceptId: true,
              isActive: true,
              group: {
                select: {
                  category: true,
                  parent: {
                    select: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      (
        prisma as unknown as {
          budgetExpenseConcept: {
            findMany(args: unknown): Promise<Array<{
              year: number;
              name: string;
              legacyBudgetConceptId: number | null;
              isActive: boolean;
              budgetGroup: string;
              group?: {
                category: string;
                parent?: {
                  category: string;
                } | null;
              } | null;
            }>>;
          };
        }
      ).budgetExpenseConcept.findMany({
        where: {
          condominiumId: condominium.id,
          year: { in: [...visibleYears] },
          isActive: true,
          legacyBudgetConceptId: { not: null },
        },
        select: {
          year: true,
          name: true,
          legacyBudgetConceptId: true,
          isActive: true,
          budgetGroup: true,
          group: {
            select: {
              category: true,
              parent: {
                select: {
                  category: true,
                },
              },
            },
          },
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
            gte: Math.max(2000, Math.min(requestedYear - 20, minLegacyYear)),
            lte: Math.max(nextYear, maxLegacyYear),
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
          status: true,
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
              concept: true,
              budgetConcept: {
                select: {
                  budgetGroup: true,
                  isActive: true,
                  group: {
                    select: {
                      category: true,
                      parent: {
                        select: {
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
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
              concept: true,
              budgetConcept: {
                select: {
                  budgetGroup: true,
                  isActive: true,
                  group: {
                    select: {
                      category: true,
                      parent: {
                        select: {
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
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

    const activeBudgetGroups = await prisma.budgetGroup.findMany({
      where: {
        condominiumId: condominium.id,
        year: { in: [...ordinaryExpenseYears] },
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Calculate ordinary active months range
    let ordinaryStartMonth = 12;
    let ordinaryEndMonth = 1;
    let hasOrdinaryRange = false;

    activeBudgetGroups.forEach((g) => {
      if (!isExtraordinaryBudgetGroup(g) && g.year === requestedYear && (g.startsAt || g.endsAt)) {
        hasOrdinaryRange = true;
        const start = g.startsAt ? new Date(g.startsAt).getUTCMonth() + 1 : 1;
        const end = g.endsAt ? new Date(g.endsAt).getUTCMonth() + 1 : 12;
        if (start < ordinaryStartMonth) ordinaryStartMonth = start;
        if (end > ordinaryEndMonth) ordinaryEndMonth = end;
      }
    });

    (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[]).forEach((c) => {
      if (c.chargeGroup?.kind === CHARGE_GROUP_KIND.ORDINARY && (c.quotaPeriodStart || c.quotaPeriodEnd)) {
        hasOrdinaryRange = true;
        const start = c.quotaPeriodStart ? new Date(c.quotaPeriodStart).getUTCMonth() + 1 : 1;
        const end = c.quotaPeriodEnd ? new Date(c.quotaPeriodEnd).getUTCMonth() + 1 : 12;
        if (start < ordinaryStartMonth) ordinaryStartMonth = start;
        if (end > ordinaryEndMonth) ordinaryEndMonth = end;
      }
    });

    const ordinaryActiveMonths = hasOrdinaryRange
      ? Array.from({ length: ordinaryEndMonth - ordinaryStartMonth + 1 }, (_, i) => ordinaryStartMonth + i)
      : Array.from({ length: 12 }, (_, i) => i + 1);

    // Calculate extraordinary active months range
    let extraordinaryStartMonth = 12;
    let extraordinaryEndMonth = 1;
    let hasExtraordinaryRange = false;

    activeBudgetGroups.forEach((g) => {
      if (isExtraordinaryBudgetGroup(g) && g.year === requestedYear && (g.startsAt || g.endsAt)) {
        hasExtraordinaryRange = true;
        const start = g.startsAt ? new Date(g.startsAt).getUTCMonth() + 1 : 1;
        const end = g.endsAt ? new Date(g.endsAt).getUTCMonth() + 1 : 12;
        if (start < extraordinaryStartMonth) extraordinaryStartMonth = start;
        if (end > extraordinaryEndMonth) extraordinaryEndMonth = end;
      }
    });

    (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[]).forEach((c) => {
      const isExtraordinary = c.chargeGroup ? EXTRAORDINARY_KINDS.has(c.chargeGroup.kind) : false;
      if (isExtraordinary && (c.quotaPeriodStart || c.quotaPeriodEnd)) {
        hasExtraordinaryRange = true;
        const start = c.quotaPeriodStart ? new Date(c.quotaPeriodStart).getUTCMonth() + 1 : 1;
        const end = c.quotaPeriodEnd ? new Date(c.quotaPeriodEnd).getUTCMonth() + 1 : 12;
        if (start < extraordinaryStartMonth) extraordinaryStartMonth = start;
        if (end > extraordinaryEndMonth) extraordinaryEndMonth = end;
      }
    });

    const extraordinaryActiveMonths = hasExtraordinaryRange
      ? Array.from({ length: extraordinaryEndMonth - extraordinaryStartMonth + 1 }, (_, i) => extraordinaryStartMonth + i)
      : Array.from({ length: 12 }, (_, i) => i + 1);

    const chargeGroupKindById = new Map<string, ChargeGroupKind>();
    const monthlyByKind = createSeriesByKind();
    const extraordinaryExpenseSeries = createZeroSeries();
    const ordinaryExpenseSeries = createZeroSeries();
    const ordinaryReceivableRowByKind = new Map<ChargeGroupKind, OrdinaryReceivableRowConfig>(
      ORDINARY_RECEIVABLE_ROWS.map((row) => [row.kind, row]),
    );
    const extraordinaryIncomeRowByKind = new Map<
      ChargeGroupKind,
      ExtraordinaryIncomeRowConfig
    >(EXTRAORDINARY_INCOME_ROWS.map((row) => [row.kind, row]));
    const ordinaryIncomeByRowAndYear = Object.fromEntries(
      ORDINARY_RECEIVABLE_ROWS.map((row) => [
        row.id,
        Object.fromEntries(visibleYears.map((year) => [year, createZeroSeries()])),
      ]),
    ) as Record<OrdinaryReceivableRowId, Record<number, number[]>>;
    const extraordinaryIncomeByRowAndYear = Object.fromEntries(
      EXTRAORDINARY_INCOME_ROWS.map((row) => [
        row.id,
        Object.fromEntries(visibleYears.map((year) => [year, createZeroSeries()])),
      ]),
    ) as Record<ExtraordinaryIncomeRowId, Record<number, number[]>>;
    const extraordinaryReceivableByRowAndYear = Object.fromEntries(
      EXTRAORDINARY_INCOME_ROWS.map((row) => [
        row.id,
        Object.fromEntries(visibleYears.map((year) => [year, createZeroSeries()])),
      ]),
    ) as Record<ExtraordinaryIncomeRowId, Record<number, number[]>>;
    const formatPeriod = (startsAt: Date | null, endsAt: Date | null): string => {
      if (!startsAt && !endsAt) return "";
      const formatM = (d: Date | null) => {
        if (!d) return "";
        const formatted = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d));
        return formatted.replace(/\b\w/g, c => c.toUpperCase());
      };
      const startStr = formatM(startsAt);
      const endStr = formatM(endsAt);
      if (startStr && endStr) return `${startStr} A ${endStr}`;
      if (startStr) return `Desde ${startStr}`;
      if (endStr) return `Hasta ${endStr}`;
      return "";
    };

    /**
     * Compute the active months array for a set of rows that each carry optional
     * startsAt / endsAt dates. Falls back to `defaultMonths` when none carry date info.
     */
    const computeActiveMonthsFromRows = (
      rows: Array<{ startsAt: Date | null; endsAt: Date | null }>,
      defaultMonths: number[],
    ): number[] => {
      let start = 13;
      let end = 0;
      let hasRange = false;
      for (const row of rows) {
        if (row.startsAt || row.endsAt) {
          hasRange = true;
          const s = row.startsAt ? new Date(row.startsAt).getUTCMonth() + 1 : 1;
          const e = row.endsAt   ? new Date(row.endsAt).getUTCMonth()   + 1 : 12;
          if (s < start) start = s;
          if (e > end)   end   = e;
        }
      }
      if (!hasRange) return defaultMonths;
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };


    const ordinaryOtherCatalogRows = (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
      .filter((catalog) => catalog.chargeGroup?.kind === CHARGE_GROUP_KIND.ORDINARY)
      .map((catalog) => {
        const period = formatPeriod(catalog.quotaPeriodStart, catalog.quotaPeriodEnd);
        const label = catalog.name + (period ? ` (${period})` : "");
        return {
          id: `ordinary-other-${catalog.id}`,
          label,
          miscCatalogId: catalog.id,
        };
      }) as OtherIncomeCatalogRow[];
    const extraordinaryOtherCatalogRows = (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
      .filter((catalog) =>
        catalog.chargeGroup
          ? EXTRAORDINARY_OTHER_INCOME_KINDS.has(catalog.chargeGroup.kind)
          : false,
      )
      .map((catalog) => {
        const period = formatPeriod(catalog.quotaPeriodStart, catalog.quotaPeriodEnd);
        const label = catalog.name + (period ? ` (${period})` : "");
        return {
          id: `extraordinary-other-${catalog.id}`,
          label,
          miscCatalogId: catalog.id,
        };
      }) as OtherIncomeCatalogRow[];
    const ordinaryOtherRowByMiscCatalogId = new Map<string, OtherIncomeCatalogRow>(
      ordinaryOtherCatalogRows.map((row) => [row.miscCatalogId, row]),
    );
    const extraordinaryOtherRowByMiscCatalogId = new Map<string, OtherIncomeCatalogRow>(
      extraordinaryOtherCatalogRows.map((row) => [row.miscCatalogId, row]),
    );
    const ordinaryOtherIncomeByRowAndYear = new Map<string, Record<number, number[]>>(
      ordinaryOtherCatalogRows.map((row) => [
        row.id,
        Object.fromEntries(visibleYears.map((year) => [year, createZeroSeries()])),
      ]),
    );
    const extraordinaryOtherIncomeByRowAndYear = new Map<string, Record<number, number[]>>(
      extraordinaryOtherCatalogRows.map((row) => [
        row.id,
        Object.fromEntries(visibleYears.map((year) => [year, createZeroSeries()])),
      ]),
    );
    const extraordinaryExpenseConceptEntriesByLegacyId = new Map<
      number,
      Array<{ year: number; name: string }>
    >();

    for (const concept of extraordinaryBudgetConcepts) {
      if (concept.legacyBudgetConceptId === null) {
        continue;
      }
      if (resolveBudgetGroup(concept) !== BUDGET_EXPENSE_GROUP.EXTRAORDINARY) {
        continue;
      }

      const entries = extraordinaryExpenseConceptEntriesByLegacyId.get(concept.legacyBudgetConceptId) ?? [];
      entries.push({ year: concept.year, name: concept.name });
      extraordinaryExpenseConceptEntriesByLegacyId.set(concept.legacyBudgetConceptId, entries);
    }

    for (const expense of expensesForLegacyYears as ExpenseSnapshot[]) {
      if (resolveExpenseBucket(expense) !== "extraordinary") {
        continue;
      }

      const legacyBudgetConceptId = expense.budgetConcept?.legacyBudgetConceptId ?? null;
      if (legacyBudgetConceptId === null) {
        continue;
      }

      const entries = extraordinaryExpenseConceptEntriesByLegacyId.get(legacyBudgetConceptId) ?? [];
      entries.push({
        year: expense.date.getUTCFullYear(),
        name: expense.budgetConcept?.name ?? `Concepto ${legacyBudgetConceptId}`,
      });
      extraordinaryExpenseConceptEntriesByLegacyId.set(legacyBudgetConceptId, entries);
    }

    const extraordinaryExpenseConceptRows = Array.from(
      extraordinaryExpenseConceptEntriesByLegacyId.entries(),
    )
      .sort((left, right) => left[0] - right[0])
      .map(([legacyBudgetConceptId, entries]) => {
        const ordered = [...entries].sort((left, right) => right.year - left.year);
        const preferred = ordered.find((entry) => !isConceptFallbackName(entry.name)) ?? ordered[0];

        return {
          id: `extraordinary-expense-concept-${legacyBudgetConceptId}`,
          label: preferred?.name ?? `Concepto ${legacyBudgetConceptId}`,
          legacyBudgetConceptId,
        };
      }) as ExtraordinaryExpenseConceptRow[];
    const extraordinaryExpenseRowByLegacyConceptId = new Map<number, ExtraordinaryExpenseConceptRow>(
      extraordinaryExpenseConceptRows.map((row) => [row.legacyBudgetConceptId, row]),
    );
    const extraordinaryExpenseByRowAndYear = new Map<string, Record<number, number[]>>(
      extraordinaryExpenseConceptRows.map((row) => [
        row.id,
        Object.fromEntries(visibleYears.map((year) => [year, createZeroSeries()])),
      ]),
    );
    const ordinaryExpenseRowByBudgetGroup = new Map<BudgetExpenseGroup, OrdinaryExpenseRow>(
      ORDINARY_EXPENSE_ROWS.map((row) => [row.budgetGroup, row]),
    );
    const ordinaryExpenseByRowAndYear = Object.fromEntries(
      ORDINARY_EXPENSE_ROWS.map((row) => [
        row.id,
        Object.fromEntries(ordinaryExpenseYears.map((year) => [year, createZeroSeries()])),
      ]),
    ) as Record<OrdinaryExpenseRowId, Record<number, number[]>>;

    for (const group of chargeGroups as ChargeGroupSnapshot[]) {
      const kind = group.kind;
      chargeGroupKindById.set(group.id, kind);
    }

    const receivableRowsById = new Map<string, {
      id: string;
      label: string;
      periodCurrentYear: number;
      periodNextYear: number;
      monthsCurrentYear: number[];
      monthsNextYear: number[];
    }>(
      ORDINARY_RECEIVABLE_ROWS.map((row) => [
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

    const payableExpenseCurrentSeries = createZeroSeries();
    const payableExpenseNextSeries = createZeroSeries();
    const payableBudgetCurrentSeries = createZeroSeries();
    const payableBudgetNextSeries = createZeroSeries();

    // Cash vs bank income series (for splitting "Bancos y caja" into two rows)
    const ordinaryBankIncomeMonthly = createZeroSeries(); // TRANSFER, CARD, CHECK, OTHER
    const ordinaryCashIncomeMonthly = createZeroSeries(); // CASH (efectivo)

    const ordinaryUnclassifiedOtherIncomeSeries = createZeroSeries();
    const ordinaryUnclassifiedOtherIncomeSeriesByYear = new Map<number, number[]>(
      visibleYears.map((year) => [year, createZeroSeries()]),
    );

    const monthly = initMonthlyRows();

    for (const detail of paymentDetails as PaymentDetailSnapshot[]) {
      if (!isPaymentVisibleInFinancialSummary(detail)) {
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
        // Track cash vs bank split
        if (detail.payment.method === "CASH") {
          addAmountToSeries(ordinaryCashIncomeMonthly, month, amount);
        } else {
          addAmountToSeries(ordinaryBankIncomeMonthly, month, amount);
        }
      } else if (bucket === "extraordinary") {
        row.extraordinaryIncome += amount;
      } else {
        row.otherIncome += amount;
      }
    }

    for (const detail of paymentDetailsForLegacyYears as PaymentDetailSnapshot[]) {
      const year = detail.payment.paidAt.getUTCFullYear();

      if (!visibleYears.includes(year as number)) {
        continue;
      }

      if (!isPaymentVisibleInFinancialSummary(detail)) {
        continue;
      }

      if (!detail.chargeGroupId) {
        continue;
      }

      const chargeGroupKind = chargeGroupKindById.get(detail.chargeGroupId) ?? null;
      if (chargeGroupKind === null) {
        continue;
      }

      const month = getMonth(detail.payment.paidAt);
      const amount = decimalToNumber(detail.amount);

      const extraordinaryRow = extraordinaryIncomeRowByKind.get(chargeGroupKind);
      if (extraordinaryRow) {
        addAmountToSeries(extraordinaryIncomeByRowAndYear[extraordinaryRow.id][year], month, amount);
      }

      const rowConfig = ordinaryReceivableRowByKind.get(chargeGroupKind);
      if (!rowConfig) {
        continue;
      }

      addAmountToSeries(ordinaryIncomeByRowAndYear[rowConfig.id][year], month, amount);
    }

    for (const income of incomes) {
      const month = getMonth(income.date);
      const row = monthly[month - 1];
      const amount = decimalToNumber(income.amount);
      const kind = income.chargeGroupId !== null && income.miscCatalogId === null
        ? (chargeGroupKindById.get(income.chargeGroupId) ?? CHARGE_GROUP_KIND.OTHER)
        : CHARGE_GROUP_KIND.OTHER;
      const extendedKind = resolveExtendedKind(kind);
      const bucket = resolveIncomeBucket(kind);

      addAmountToSeries(monthlyByKind[extendedKind], month, amount);

      if (bucket === "ordinary") {
        row.ordinaryIncome += amount;
        // Track cash vs bank split
        if ((income as IncomeSnapshot).paymentMethod === "CASH") {
          addAmountToSeries(ordinaryCashIncomeMonthly, month, amount);
        } else {
          addAmountToSeries(ordinaryBankIncomeMonthly, month, amount);
        }
      } else if (bucket === "extraordinary") {
        row.extraordinaryIncome += amount;
      } else {
        row.otherIncome += amount;
        if (income.miscCatalogId === null) {
          addAmountToSeries(ordinaryUnclassifiedOtherIncomeSeries, month, amount);
        }
      }
    }

    for (const income of incomesForLegacyYears as IncomeSnapshot[]) {
      const year = income.date.getUTCFullYear();

      if (!visibleYears.includes(year as number)) {
        continue;
      }

      const incomeKind =
        income.chargeGroupId !== null && income.miscCatalogId === null
          ? (chargeGroupKindById.get(income.chargeGroupId) ?? null)
          : null;
      if (incomeKind !== null) {
        const extraordinaryRow = extraordinaryIncomeRowByKind.get(incomeKind);
        if (extraordinaryRow) {
          const month = getMonth(income.date);
          const amount = decimalToNumber(income.amount);
          addAmountToSeries(
            extraordinaryIncomeByRowAndYear[extraordinaryRow.id][year],
            month,
            amount,
          );
        }
      }

      const month = getMonth(income.date);
      const amount = decimalToNumber(income.amount);

      if (income.miscCatalogId === null) {
        const isCoreKind = income.chargeGroupId !== null &&
          [CHARGE_GROUP_KIND.ORDINARY, CHARGE_GROUP_KIND.STC, CHARGE_GROUP_KIND.SANCTION, CHARGE_GROUP_KIND.COMODATO].includes(
            chargeGroupKindById.get(income.chargeGroupId) as any
          );
        if (!isCoreKind) {
          const series = ordinaryUnclassifiedOtherIncomeSeriesByYear.get(year);
          if (series) {
            addAmountToSeries(series, month, amount);
          }
        }
        continue;
      }

      const ordinaryRow = ordinaryOtherRowByMiscCatalogId.get(income.miscCatalogId);
      if (ordinaryRow) {
        const byYear = ordinaryOtherIncomeByRowAndYear.get(ordinaryRow.id);
        if (byYear) {
          addAmountToSeries(byYear[year], month, amount);
        }
      }

      const extraordinaryRow = extraordinaryOtherRowByMiscCatalogId.get(income.miscCatalogId);
      if (extraordinaryRow) {
        const byYear = extraordinaryOtherIncomeByRowAndYear.get(extraordinaryRow.id);
        if (byYear) {
          addAmountToSeries(byYear[year], month, amount);
        }
      }
    }

    for (const expense of expenses) {
      const month = getMonth(expense.date);
      const row = monthly[month - 1];
      const amount = decimalToNumber(expense.amount);

      row.totalExpenses += amount;

      if (resolveExpenseBucket(expense) === "extraordinary") {
        addAmountToSeries(extraordinaryExpenseSeries, month, amount);
        continue;
      }

      const budgetConcept = expense.budgetConcept;
      if (!budgetConcept) {
        continue;
      }

      if (budgetConcept.year !== requestedYear) {
        continue;
      }

      if (!budgetConcept.isActive) {
        continue;
      }

      if (!ORDINARY_BUDGET_EXPENSE_GROUPS.has(resolveBudgetGroup(budgetConcept) as BudgetExpenseGroup)) {
        continue;
      }

      addAmountToSeries(ordinaryExpenseSeries, month, amount);

      // Track cash vs bank split of ordinary expenses
      if (expense.paymentMethod === "CASH") {
        addAmountToSeries(ordinaryCashIncomeMonthly, month, -amount);
      } else {
        addAmountToSeries(ordinaryBankIncomeMonthly, month, -amount);
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

      const budgetConcept = expense.budgetConcept;
      if (!budgetConcept) {
        continue;
      }

      if (budgetConcept.year !== year) {
        continue;
      }

      if (!budgetConcept.isActive) {
        continue;
      }

      const resolvedGroup = resolveBudgetGroup(budgetConcept) as BudgetExpenseGroup;
      if (!ORDINARY_BUDGET_EXPENSE_GROUPS.has(resolvedGroup)) {
        continue;
      }

      const rowMeta = ordinaryExpenseRowByBudgetGroup.get(resolvedGroup);
      if (!rowMeta) {
        continue;
      }

      const month = getMonth(expense.date);
      const amount = decimalToNumber(expense.amount);
      addAmountToSeries(ordinaryExpenseByRowAndYear[rowMeta.id][year], month, amount);
    }

    for (const expense of expensesForLegacyYears as ExpenseSnapshot[]) {
      const year = expense.date.getUTCFullYear();
      if (!visibleYears.includes(year as number)) {
        continue;
      }

      if (resolveExpenseBucket(expense) !== "extraordinary") {
        continue;
      }

      const legacyBudgetConceptId = expense.budgetConcept?.legacyBudgetConceptId ?? null;
      if (legacyBudgetConceptId === null) {
        continue;
      }

      const row = extraordinaryExpenseRowByLegacyConceptId.get(legacyBudgetConceptId);
      if (!row) {
        continue;
      }

      const byYear = extraordinaryExpenseByRowAndYear.get(row.id);
      if (!byYear) {
        continue;
      }

      const month = getMonth(expense.date);
      const amount = decimalToNumber(expense.amount);
      addAmountToSeries(byYear[year], month, amount);
    }

    let overduePortfolioTotal = 0;
    let minOverdueYear: number | null = null;

    for (const charge of chargesForOrdinaryLedger as ChargeLedgerSnapshot[]) {
      const chargeGroupKind = chargeGroupKindById.get(charge.chargeGroupId) ?? null;
      if (chargeGroupKind === null) {
        continue;
      }

      const outstandingAmount =
        decimalToNumber(charge.amount) - decimalToNumber(charge.paidAmount);
      if (outstandingAmount <= 0) {
        continue;
      }

      const normalizedMonth = normalizePeriodMonth(charge.periodMonth);
      const isCanceled = charge.status === "CANCELED";
      const extraordinaryReceivableRow = extraordinaryIncomeRowByKind.get(chargeGroupKind);

      if (
        extraordinaryReceivableRow &&
        visibleYears.includes(charge.periodYear as number) &&
        normalizedMonth !== null &&
        !isCanceled
      ) {
        addAmountToSeries(
          extraordinaryReceivableByRowAndYear[extraordinaryReceivableRow.id][charge.periodYear],
          normalizedMonth,
          outstandingAmount,
        );
      }

      const rowConfig = ordinaryReceivableRowByKind.get(chargeGroupKind);
      if (!rowConfig) {
        continue;
      }

      const rowState = receivableRowsById.get(rowConfig.id);
      if (!rowState) {
        continue;
      }

      if (charge.periodYear === requestedYear && !isCanceled) {
        rowState.periodCurrentYear += outstandingAmount;
        if (normalizedMonth !== null) {
          addAmountToSeries(rowState.monthsCurrentYear, normalizedMonth, outstandingAmount);
        }
        continue;
      }

      if (charge.periodYear === nextYear && !isCanceled) {
        rowState.periodNextYear += outstandingAmount;
        if (normalizedMonth !== null) {
          addAmountToSeries(rowState.monthsNextYear, normalizedMonth, outstandingAmount);
        }
        continue;
      }

      if (
        charge.status === "OPEN" &&
        charge.periodYear < requestedYear - 1
      ) {
        overduePortfolioTotal += outstandingAmount;
        minOverdueYear =
          minOverdueYear === null
            ? charge.periodYear
            : Math.min(minOverdueYear, charge.periodYear);
      }
    }

    const addBudgetSeries = (
      budgetSnapshot: BudgetSnapshot | null,
      outputSeries: number[],
    ): void => {
      if (!budgetSnapshot) {
        return;
      }

      for (const line of budgetSnapshot.lines) {
        const budgetConcept = line.budgetConcept;
        if (!budgetConcept) {
          continue;
        }

        if (!budgetConcept.isActive) {
          continue;
        }

        if (!ORDINARY_BUDGET_EXPENSE_GROUPS.has(resolveBudgetGroup(budgetConcept) as BudgetExpenseGroup)) {
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

    addBudgetSeries(
      currentBudget as BudgetSnapshot | null,
      payableBudgetCurrentSeries,
    );
    addBudgetSeries(
      nextBudget as BudgetSnapshot | null,
      payableBudgetNextSeries,
    );

    for (const expense of expensesForOrdinaryExpenseYears as ExpenseSnapshot[]) {
      const year = expense.date.getUTCFullYear();
      if (!ordinaryExpenseYears.includes(year as (typeof ordinaryExpenseYears)[number])) {
        continue;
      }

      const budgetConcept = expense.budgetConcept;
      if (!budgetConcept) {
        continue;
      }

      if (budgetConcept.year !== year) {
        continue;
      }

      if (!budgetConcept.isActive) {
        continue;
      }

      if (!ORDINARY_BUDGET_EXPENSE_GROUPS.has(resolveBudgetGroup(budgetConcept) as BudgetExpenseGroup)) {
        continue;
      }

      const month = getMonth(expense.date);
      const amount = decimalToNumber(expense.amount);

      if (year === requestedYear) {
        addAmountToSeries(payableExpenseCurrentSeries, month, amount);
      } else {
        addAmountToSeries(payableExpenseNextSeries, month, amount);
      }
    }

    const payableCurrentSeries = subtractSeries(
      payableBudgetCurrentSeries,
      payableExpenseCurrentSeries,
    );
    const payableNextSeries = subtractSeries(
      payableBudgetNextSeries,
      payableExpenseNextSeries,
    );

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

    const requestedYearIsLegacyVisible = visibleYears.includes(
      requestedYear as number,
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
    const extraordinaryOtherSeriesByRowForRequestedYear = new Map<string, number[]>(
      extraordinaryOtherCatalogRows.map((row) => {
        const byYear = extraordinaryOtherIncomeByRowAndYear.get(row.id);
        return [
          row.id,
          requestedYearIsLegacyVisible
            ? (byYear?.[requestedYear] ?? createZeroSeries())
            : createZeroSeries(),
        ];
      }),
    );
    const extraordinaryExpenseSeriesByRowForRequestedYear = new Map<string, number[]>(
      extraordinaryExpenseConceptRows.map((row) => {
        const byYear = extraordinaryExpenseByRowAndYear.get(row.id);
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
        if (income.miscCatalogId === null) {
          continue;
        }

        const month = getMonth(income.date);
        const amount = decimalToNumber(income.amount);

        const ordinaryRow = ordinaryOtherRowByMiscCatalogId.get(income.miscCatalogId);
        if (ordinaryRow) {
          const series = ordinaryOtherSeriesByRowForRequestedYear.get(ordinaryRow.id);
          if (series) {
            addAmountToSeries(series, month, amount);
          }
        }

        const extraordinaryRow = extraordinaryOtherRowByMiscCatalogId.get(income.miscCatalogId);
        if (extraordinaryRow) {
          const series = extraordinaryOtherSeriesByRowForRequestedYear.get(extraordinaryRow.id);
          if (series) {
            addAmountToSeries(series, month, amount);
          }
        }
      }

      for (const expense of expenses as ExpenseSnapshot[]) {
        if (resolveExpenseBucket(expense) !== "extraordinary") {
          continue;
        }

        const legacyBudgetConceptId = expense.budgetConcept?.legacyBudgetConceptId ?? null;
        if (legacyBudgetConceptId === null) {
          continue;
        }

        const row = extraordinaryExpenseRowByLegacyConceptId.get(legacyBudgetConceptId);
        if (!row) {
          continue;
        }

        const series = extraordinaryExpenseSeriesByRowForRequestedYear.get(row.id);
        if (!series) {
          continue;
        }

        const month = getMonth(expense.date);
        const amount = decimalToNumber(expense.amount);
        addAmountToSeries(series, month, amount);
      }
    }

    const ordinaryOtherSeriesList = [
      ...ordinaryOtherCatalogRows.map(
        (row) => ordinaryOtherSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
      ),
      ordinaryUnclassifiedOtherIncomeSeries,
    ];
    const ordinaryOtherIncomeSeries = sumSeries(ordinaryOtherSeriesList);
    const ordinaryTotalIncomeSeries = sumSeries([
      ordinaryIncomeSeries,
      ordinaryOtherIncomeSeries,
    ]);
    const ordinaryBalanceSeries = subtractSeries(
      ordinaryTotalIncomeSeries,
      ordinaryExpenseSeries,
    );
    const ordinaryBanksCashSeries = cumulativeSeries(ordinaryBalanceSeries);
    // Monthly net flow by method (for split display)
    const ordinaryBanksSeries = ordinaryBankIncomeMonthly;
    const ordinaryCashSeries = ordinaryCashIncomeMonthly;

    const extraordinaryIncomeSeries = sumSeries([
      monthlyByKind[CHARGE_GROUP_KIND.EXTRA_CONDO],
      monthlyByKind[CHARGE_GROUP_KIND.EXTRA_COMMERCE],
    ]);

    const extraordinaryOtherSeriesList = extraordinaryOtherCatalogRows.map(
      (row) => extraordinaryOtherSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
    );
    const extraordinaryOtherIncomeSeries =
      extraordinaryOtherSeriesList.length > 0
        ? sumSeries(extraordinaryOtherSeriesList)
        : createZeroSeries();
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
            rows: [
              ...ordinaryOtherCatalogRows.map((row) =>
                toTableRow(
                  row.id,
                  row.label,
                  ordinaryOtherSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
                ),
              ),
              toTableRow(
                "ordinary-other-unclassified",
                "Otros ingresos",
                ordinaryUnclassifiedOtherIncomeSeries,
              ),
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
              toTableRow("ordinary-balance-income", "Ingresos", ordinaryTotalIncomeSeries),
              toTableRow("ordinary-balance-expenses", "Egresos", ordinaryExpenseSeries),
              toTableRow("ordinary-balance-total", "Total", ordinaryBalanceSeries, true),
              toTableRow(
                "ordinary-banks",
                "Bancos (Transferencia, Cheque, Tarjeta)",
                ordinaryBanksSeries,
              ),
              toTableRow(
                "ordinary-cash",
                "Caja (Efectivo)",
                ordinaryCashSeries,
              ),
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
            rows:
              extraordinaryOtherCatalogRows.length > 0
                ? [
                    ...extraordinaryOtherCatalogRows.map((row) =>
                      toTableRow(
                        row.id,
                        row.label,
                        extraordinaryOtherSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
                      ),
                    ),
                    toTableRow("extra-other-total", "Total", extraordinaryOtherIncomeSeries, true),
                  ]
                : [
                    toTableRow(
                      "extra-other",
                      "Otros ingresos extraordinarios",
                      extraordinaryOtherIncomeSeries,
                    ),
                    toTableRow("extra-other-total", "Total", extraordinaryOtherIncomeSeries, true),
                  ],
          },
          {
            id: "extraordinary-expenses",
            title: "Egresos mensuales",
            rows:
              extraordinaryExpenseConceptRows.length > 0
                ? [
                    ...extraordinaryExpenseConceptRows.map((row) =>
                      toTableRow(
                        row.id,
                        row.label,
                        extraordinaryExpenseSeriesByRowForRequestedYear.get(row.id) ?? createZeroSeries(),
                      ),
                    ),
                    toTableRow("extra-expense-total", "Total", extraordinaryExpenseSeries, true),
                  ]
                : [
                    toTableRow("extra-expense", "Egresos extraordinarios", extraordinaryExpenseSeries),
                    toTableRow("extra-expense-total", "Total", extraordinaryExpenseSeries, true),
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
      years: [...visibleYears],
      rows: [
        ...ORDINARY_RECEIVABLE_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          yearly: visibleYears.map((year) =>
            toYearSlice(year, ordinaryIncomeByRowAndYear[row.id][year]),
          ),
        })),
        {
          id: "ordinary-income-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSlice(
              year,
              sumSeries([
                ...ORDINARY_RECEIVABLE_ROWS.map((row) => ordinaryIncomeByRowAndYear[row.id][year]),
              ]),
            ),
          ),
        },
      ],
    };

    const extraordinaryIncomeMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "extraordinary-income-multi-year",
      title: "Ingresos mensuales",
      years: [...visibleYears],
      activeMonths: computeActiveMonthsFromRows(
        (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
          .filter((c) => c.chargeGroup ? EXTRAORDINARY_OTHER_INCOME_KINDS.has(c.chargeGroup.kind) : false)
          .map((c) => ({ startsAt: c.quotaPeriodStart, endsAt: c.quotaPeriodEnd })),
        extraordinaryActiveMonths,
      ),
      rows: [
        ...EXTRAORDINARY_INCOME_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          yearly: visibleYears.map((year) =>
            toYearSlice(year, extraordinaryIncomeByRowAndYear[row.id][year]),
          ),
        })),
        {
          id: "extraordinary-income-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSlice(
              year,
              sumSeries(
                EXTRAORDINARY_INCOME_ROWS.map(
                  (row) => extraordinaryIncomeByRowAndYear[row.id][year],
                ),
              ),
            ),
          ),
        },
      ],
    };

    const ordinaryOtherIncomeMultiYearRows = [
      ...ordinaryOtherCatalogRows.map((row) => ({
        id: row.id,
        label: row.label,
        yearly: visibleYears.map((year) =>
          toYearSlice(year, ordinaryOtherIncomeByRowAndYear.get(row.id)?.[year] ?? createZeroSeries()),
        ),
      })),
    ];

    const ordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "ordinary-other-income-multi-year",
      title: "Otros ingresos",
      years: [...visibleYears],
      rows: [
        ...ordinaryOtherIncomeMultiYearRows,
        {
          id: "ordinary-other-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
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

    const extraordinaryOtherIncomeMultiYearRows =
      extraordinaryOtherCatalogRows.length > 0
        ? extraordinaryOtherCatalogRows.map((row) => ({
            id: row.id,
            label: row.label,
            yearly: visibleYears.map((year) =>
              toYearSlice(
                year,
                extraordinaryOtherIncomeByRowAndYear.get(row.id)?.[year] ?? createZeroSeries(),
              ),
            ),
          }))
        : [];

    const extraordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "extraordinary-other-income-multi-year",
      title: "Otros ingresos",
      years: [...visibleYears],
      activeMonths: computeActiveMonthsFromRows(
        (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
          .filter((c) => c.chargeGroup ? EXTRAORDINARY_OTHER_INCOME_KINDS.has(c.chargeGroup.kind) : false)
          .map((c) => ({ startsAt: c.quotaPeriodStart, endsAt: c.quotaPeriodEnd })),
        extraordinaryActiveMonths,
      ),
      rows: extraordinaryOtherIncomeMultiYearRows.length > 0 ? [
        ...extraordinaryOtherIncomeMultiYearRows,
        {
          id: "extraordinary-other-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSlice(
              year,
              sumSeries(
                extraordinaryOtherIncomeMultiYearRows.map(
                  (row) =>
                    row.yearly.find((slice) => slice.year === year)?.months ?? createZeroSeries(),
                ),
              ),
            ),
          ),
        },
      ] : [],
    };

    const extraordinaryExpensesMultiYearRows =
      extraordinaryExpenseConceptRows.length > 0
        ? extraordinaryExpenseConceptRows.map((row) => ({
            id: row.id,
            label: row.label,
            yearly: visibleYears.map((year) =>
              toYearSlice(year, extraordinaryExpenseByRowAndYear.get(row.id)?.[year] ?? createZeroSeries()),
            ),
          }))
        : [
            {
              id: "extraordinary-expense",
              label: "Egresos extraordinarios",
              yearly: visibleYears.map((year) => toYearSlice(year, createZeroSeries())),
            },
          ];

    const extraordinaryExpensesMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "extraordinary-expenses-multi-year",
      title: "Egresos mensuales",
      years: [...visibleYears],
      rows: [
        ...extraordinaryExpensesMultiYearRows,
        {
          id: "extraordinary-expenses-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSlice(
              year,
              sumSeries(
                extraordinaryExpensesMultiYearRows.map(
                  (row) => row.yearly.find((slice) => slice.year === year)?.months ?? createZeroSeries(),
                ),
              ),
            ),
          ),
        },
      ],
    };

    const extraordinaryBalanceByYear = new Map<number, number[]>(
      visibleYears.map((year) => {
        const extraordinaryIncomeForYear = sumSeries(
          EXTRAORDINARY_INCOME_ROWS.map((row) => extraordinaryIncomeByRowAndYear[row.id][year]),
        );
        const extraordinaryOtherIncomeForYear = sumSeries(
          extraordinaryOtherCatalogRows.map(
            (row) => extraordinaryOtherIncomeByRowAndYear.get(row.id)?.[year] ?? createZeroSeries(),
          ),
        );
        const extraordinaryExpenseForYear = sumSeries(
          extraordinaryExpenseConceptRows.map(
            (row) => extraordinaryExpenseByRowAndYear.get(row.id)?.[year] ?? createZeroSeries(),
          ),
        );

        return [
          year,
          subtractSeries(
            sumSeries([extraordinaryIncomeForYear, extraordinaryOtherIncomeForYear]),
            extraordinaryExpenseForYear,
          ),
        ];
      }),
    );
    const extraordinaryBanksCashByYear = new Map<number, number[]>(
      visibleYears.map((year) => [
        year,
        cumulativeSeries(extraordinaryBalanceByYear.get(year) ?? createZeroSeries()),
      ]),
    );

    const extraordinaryBalanceMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "extraordinary-balance-multi-year",
      title: "Saldo Ingresos - Egresos Extraordinarios",
      years: [...visibleYears],
      activeMonths: computeActiveMonthsFromRows(
        (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
          .filter((c) => c.chargeGroup ? EXTRAORDINARY_OTHER_INCOME_KINDS.has(c.chargeGroup.kind) : false)
          .map((c) => ({ startsAt: c.quotaPeriodStart, endsAt: c.quotaPeriodEnd })),
        extraordinaryActiveMonths,
      ),
      rows: [
        {
          id: "extraordinary-balance-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSlice(year, extraordinaryBalanceByYear.get(year) ?? createZeroSeries()),
          ),
        },
        {
          id: "extraordinary-banks-cash",
          label: "Bancos y caja",
          yearly: visibleYears.map((year) =>
            toYearSlice(year, extraordinaryBanksCashByYear.get(year) ?? createZeroSeries()),
          ),
        },
      ],
    };

    const extraordinaryReceivablesMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "extraordinary-receivables-multi-year",
      title: "Cuentas por cobrar - Cuotas extraordinarias",
      years: [...visibleYears],
      activeMonths: computeActiveMonthsFromRows(
        (miscIncomeCatalogs as MiscIncomeCatalogSnapshot[])
          .filter((c) => c.chargeGroup ? EXTRAORDINARY_OTHER_INCOME_KINDS.has(c.chargeGroup.kind) : false)
          .map((c) => ({ startsAt: c.quotaPeriodStart, endsAt: c.quotaPeriodEnd })),
        extraordinaryActiveMonths,
      ),
      rows: [
        ...EXTRAORDINARY_INCOME_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          yearly: visibleYears.map((year) =>
            toYearSlice(year, extraordinaryReceivableByRowAndYear[row.id][year]),
          ),
        })),
        {
          id: "extraordinary-receivables-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSlice(
              year,
              sumSeries(
                EXTRAORDINARY_INCOME_ROWS.map(
                  (row) => extraordinaryReceivableByRowAndYear[row.id][year],
                ),
              ),
            ),
          ),
        },
      ],
    };

    const extraordinaryPayablesMultiYearRows =
      extraordinaryExpenseConceptRows.length > 0
        ? extraordinaryExpenseConceptRows.map((row) => ({
            id: row.id,
            label: row.label,
            yearly: visibleYears.map((year) =>
              toYearSliceWithPeriodEndTotal(
                year,
                cumulativeSeries(
                  (extraordinaryExpenseByRowAndYear.get(row.id)?.[year] ?? createZeroSeries()).map(
                    (value) => -value,
                  ),
                ),
              ),
            ),
          }))
        : [
            {
              id: "extraordinary-payable",
              label: "Cuotas extraordinarias",
              yearly: visibleYears.map((year) =>
                toYearSliceWithPeriodEndTotal(year, createZeroSeries()),
              ),
            },
          ];

    const extraordinaryPayablesMultiYearTable: FinancialSummaryMultiYearTable = {
      id: "extraordinary-payables-multi-year",
      title: "Cuentas por pagar - Cuotas extraordinarias",
      years: [...visibleYears],
      rows: [
        ...extraordinaryPayablesMultiYearRows,
        {
          id: "extraordinary-payables-total",
          label: "Total",
          isTotal: true,
          yearly: visibleYears.map((year) =>
            toYearSliceWithPeriodEndTotal(
              year,
              sumSeries(
                extraordinaryPayablesMultiYearRows.map(
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
        ...ORDINARY_EXPENSE_ROWS.map((row) => ({
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
                ORDINARY_EXPENSE_ROWS.map(
                  (row) => ordinaryExpenseByRowAndYear[row.id][year],
                ),
              ),
            ),
          ),
        },
      ],
    };

    const ordinaryReceivableRows: FinancialSummaryOrdinaryReceivableRow[] =
      ORDINARY_RECEIVABLE_ROWS.map((row) => {
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
      ordinaryActiveMonths,
      extraordinaryActiveMonths,
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
      extraordinaryIncomeMultiYearTable,
      ordinaryOtherIncomeMultiYearTable,
      extraordinaryOtherIncomeMultiYearTable,
      extraordinaryExpensesMultiYearTable,
      extraordinaryBalanceMultiYearTable,
      extraordinaryReceivablesMultiYearTable,
      extraordinaryPayablesMultiYearTable,
      ordinaryExpensesLegacyTable,
      ordinaryReceivablesTable,
      ordinaryPayablesTable,
      generatedAt: new Date(),
    };
  }
}
