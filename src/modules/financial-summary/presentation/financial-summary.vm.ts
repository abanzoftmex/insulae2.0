import type { FinancialSummary, FinancialSummaryMultiYearTable } from "../domain/financial-summary";

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export interface FinancialSummaryMonthVM {
  month: number;
  monthLabel: string;
  ordinaryIncome: string;
  extraordinaryIncome: string;
  otherIncome: string;
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  balanceValue: number;
}

export interface FinancialSummaryTableRowVM {
  id: string;
  label: string;
  months: string[];
  monthsValue: number[];
  annualTotal: string;
  annualTotalValue: number;
  isTotal: boolean;
}

export interface FinancialSummaryTableVM {
  id: string;
  title: string;
  rows: FinancialSummaryTableRowVM[];
}

export interface FinancialSummaryBlockVM {
  id: string;
  title: string;
  tables: FinancialSummaryTableVM[];
}

export interface FinancialSummaryYearSliceVM {
  year: number;
  annualTotal: string;
  annualTotalValue: number;
  months: string[];
  monthsValue: number[];
}

export interface FinancialSummaryMultiYearTableRowVM {
  id: string;
  label: string;
  yearly: FinancialSummaryYearSliceVM[];
  isTotal: boolean;
}

export interface FinancialSummaryMultiYearTableVM {
  id: string;
  title: string;
  years: number[];
  monthLabels: string[];
  rows: FinancialSummaryMultiYearTableRowVM[];
}

export interface FinancialSummaryOrdinaryReceivableRowVM {
  id: string;
  label: string;
  periodCurrentYear: string;
  periodCurrentYearValue: number;
  overduePortfolio: string;
  overduePortfolioValue: number | null;
  monthsCurrentYear: string[];
  monthsCurrentYearValue: number[];
  periodNextYear: string;
  periodNextYearValue: number;
  monthsNextYear: string[];
  monthsNextYearValue: number[];
  isTotal: boolean;
}

export interface FinancialSummaryOrdinaryReceivableTableVM {
  id: string;
  title: string;
  currentYear: number;
  nextYear: number;
  overdueStartYear: number;
  overdueEndYear: number;
  rows: FinancialSummaryOrdinaryReceivableRowVM[];
}

export interface FinancialSummaryOrdinaryPayableRowVM {
  id: string;
  label: string;
  periodCurrentYear: string;
  periodCurrentYearValue: number;
  monthsCurrentYear: string[];
  monthsCurrentYearValue: number[];
  totalAnnualNextYear: string;
  totalAnnualNextYearValue: number;
  periodNextYear: string;
  periodNextYearValue: number;
  monthsNextYear: string[];
  monthsNextYearValue: number[];
}

export interface FinancialSummaryOrdinaryPayableTableVM {
  id: string;
  title: string;
  currentYear: number;
  nextYear: number;
  rows: FinancialSummaryOrdinaryPayableRowVM[];
}

export interface FinancialSummaryVM {
  condominiumName: string;
  condominiumSlug: string;
  selectedYear: number;
  availableYears: number[];
  ordinaryMonthLabels: string[];
  extraordinaryMonthLabels: string[];
  months: FinancialSummaryMonthVM[];
  blocks: FinancialSummaryBlockVM[];
  ordinaryIncomeMultiYearTable: FinancialSummaryMultiYearTableVM;
  extraordinaryIncomeMultiYearTable: FinancialSummaryMultiYearTableVM;
  ordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTableVM;
  extraordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTableVM;
  extraordinaryExpensesMultiYearTable: FinancialSummaryMultiYearTableVM;
  extraordinaryBalanceMultiYearTable: FinancialSummaryMultiYearTableVM;
  extraordinaryReceivablesMultiYearTable: FinancialSummaryMultiYearTableVM;
  extraordinaryPayablesMultiYearTable: FinancialSummaryMultiYearTableVM;
  ordinaryExpensesLegacyTable: FinancialSummaryMultiYearTableVM;
  ordinaryReceivablesTable: FinancialSummaryOrdinaryReceivableTableVM;
  ordinaryPayablesTable: FinancialSummaryOrdinaryPayableTableVM;
  totals: {
    ordinaryIncome: string;
    extraordinaryIncome: string;
    otherIncome: string;
    totalIncome: string;
    totalExpenses: string;
    annualBalance: string;
    annualBalanceValue: number;
  };
  generatedAtLabel: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function toFinancialSummaryVM(summary: FinancialSummary): FinancialSummaryVM {
  const ordinaryActiveMonths = summary.ordinaryActiveMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const extraordinaryActiveMonths = summary.extraordinaryActiveMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const ordinaryMonthLabels = ordinaryActiveMonths.map((m) => MONTH_LABELS[m - 1] ?? `Mes ${m}`);
  const extraordinaryMonthLabels = extraordinaryActiveMonths.map((m) => MONTH_LABELS[m - 1] ?? `Mes ${m}`);

  const mapMultiYearTable = (
    table: FinancialSummaryMultiYearTable,
    fallbackActiveMonths: number[],
  ): FinancialSummaryMultiYearTableVM => {
    const activeMs = table.activeMonths ?? fallbackActiveMonths;
    const monthLabels = activeMs.map((m) => MONTH_LABELS[m - 1] ?? `Mes ${m}`);
    return {
      id: table.id,
      title: table.title,
      years: table.years,
      monthLabels,
      rows: table.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months
            .filter((_, idx) => activeMs.includes(idx + 1))
            .map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months.filter((_, idx) => activeMs.includes(idx + 1)),
        })),
      })),
    };
  };

  return {
    condominiumName: summary.condominiumName,
    condominiumSlug: summary.condominiumSlug,
    selectedYear: summary.year,
    availableYears: summary.availableYears,
    ordinaryMonthLabels,
    extraordinaryMonthLabels,
    months: summary.months
      .filter((month) => ordinaryActiveMonths.includes(month.month))
      .map((month) => ({
        month: month.month,
        monthLabel: MONTH_LABELS[month.month - 1] ?? `Mes ${month.month}`,
        ordinaryIncome: formatCurrency(month.ordinaryIncome),
        extraordinaryIncome: formatCurrency(month.extraordinaryIncome),
        otherIncome: formatCurrency(month.otherIncome),
        totalIncome: formatCurrency(month.totalIncome),
        totalExpenses: formatCurrency(month.totalExpenses),
        balance: formatCurrency(month.balance),
        balanceValue: month.balance,
      })),
    blocks: summary.blocks.map((block) => {
      const activeMs = block.id === "ordinary" ? ordinaryActiveMonths : extraordinaryActiveMonths;
      return {
        id: block.id,
        title: block.title,
        tables: block.tables.map((table) => ({
          id: table.id,
          title: table.title,
          rows: table.rows.map((row) => ({
            id: row.id,
            label: row.label,
            months: row.months
              .filter((_, idx) => activeMs.includes(idx + 1))
              .map((value) => formatCurrency(value)),
            monthsValue: row.months.filter((_, idx) => activeMs.includes(idx + 1)),
            annualTotal: formatCurrency(row.annualTotal),
            annualTotalValue: row.annualTotal,
            isTotal: row.isTotal ?? false,
          })),
        })),
      };
    }),
    ordinaryIncomeMultiYearTable: mapMultiYearTable(summary.ordinaryIncomeMultiYearTable, ordinaryActiveMonths),
    extraordinaryIncomeMultiYearTable: mapMultiYearTable(summary.extraordinaryIncomeMultiYearTable, extraordinaryActiveMonths),
    ordinaryOtherIncomeMultiYearTable: mapMultiYearTable(summary.ordinaryOtherIncomeMultiYearTable, ordinaryActiveMonths),
    extraordinaryOtherIncomeMultiYearTable: mapMultiYearTable(summary.extraordinaryOtherIncomeMultiYearTable, extraordinaryActiveMonths),
    extraordinaryExpensesMultiYearTable: mapMultiYearTable(summary.extraordinaryExpensesMultiYearTable, extraordinaryActiveMonths),
    extraordinaryBalanceMultiYearTable: mapMultiYearTable(summary.extraordinaryBalanceMultiYearTable, extraordinaryActiveMonths),
    extraordinaryReceivablesMultiYearTable: mapMultiYearTable(summary.extraordinaryReceivablesMultiYearTable, extraordinaryActiveMonths),
    extraordinaryPayablesMultiYearTable: mapMultiYearTable(summary.extraordinaryPayablesMultiYearTable, extraordinaryActiveMonths),
    ordinaryExpensesLegacyTable: mapMultiYearTable(summary.ordinaryExpensesLegacyTable, ordinaryActiveMonths),
    ordinaryReceivablesTable: {
      id: summary.ordinaryReceivablesTable.id,
      title: summary.ordinaryReceivablesTable.title,
      currentYear: summary.ordinaryReceivablesTable.currentYear,
      nextYear: summary.ordinaryReceivablesTable.nextYear,
      overdueStartYear: summary.ordinaryReceivablesTable.overdueStartYear,
      overdueEndYear: summary.ordinaryReceivablesTable.overdueEndYear,
      rows: summary.ordinaryReceivablesTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        periodCurrentYear: formatCurrency(row.periodCurrentYear),
        periodCurrentYearValue: row.periodCurrentYear,
        overduePortfolio:
          row.overduePortfolio === null ? "--" : formatCurrency(row.overduePortfolio),
        overduePortfolioValue: row.overduePortfolio,
        monthsCurrentYear: row.monthsCurrentYear
          .filter((_, idx) => ordinaryActiveMonths.includes(idx + 1))
          .map((value) => formatCurrency(value)),
        monthsCurrentYearValue: row.monthsCurrentYear.filter((_, idx) => ordinaryActiveMonths.includes(idx + 1)),
        periodNextYear: formatCurrency(row.periodNextYear),
        periodNextYearValue: row.periodNextYear,
        monthsNextYear: row.monthsNextYear
          .filter((_, idx) => ordinaryActiveMonths.includes(idx + 1))
          .map((value) => formatCurrency(value)),
        monthsNextYearValue: row.monthsNextYear.filter((_, idx) => ordinaryActiveMonths.includes(idx + 1)),
        isTotal: row.isTotal ?? false,
      })),
    },
    ordinaryPayablesTable: {
      id: summary.ordinaryPayablesTable.id,
      title: summary.ordinaryPayablesTable.title,
      currentYear: summary.ordinaryPayablesTable.currentYear,
      nextYear: summary.ordinaryPayablesTable.nextYear,
      rows: summary.ordinaryPayablesTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        periodCurrentYear: formatCurrency(row.periodCurrentYear),
        periodCurrentYearValue: row.periodCurrentYear,
        monthsCurrentYear: row.monthsCurrentYear
          .filter((_, idx) => ordinaryActiveMonths.includes(idx + 1))
          .map((value) => formatCurrency(value)),
        monthsCurrentYearValue: row.monthsCurrentYear.filter((_, idx) => ordinaryActiveMonths.includes(idx + 1)),
        totalAnnualNextYear: formatCurrency(row.totalAnnualNextYear),
        totalAnnualNextYearValue: row.totalAnnualNextYear,
        periodNextYear: formatCurrency(row.periodNextYear),
        periodNextYearValue: row.periodNextYear,
        monthsNextYear: row.monthsNextYear
          .filter((_, idx) => ordinaryActiveMonths.includes(idx + 1))
          .map((value) => formatCurrency(value)),
        monthsNextYearValue: row.monthsNextYear.filter((_, idx) => ordinaryActiveMonths.includes(idx + 1)),
      })),
    },
    totals: {
      ordinaryIncome: formatCurrency(summary.totals.ordinaryIncome),
      extraordinaryIncome: formatCurrency(summary.totals.extraordinaryIncome),
      otherIncome: formatCurrency(summary.totals.otherIncome),
      totalIncome: formatCurrency(summary.totals.totalIncome),
      totalExpenses: formatCurrency(summary.totals.totalExpenses),
      annualBalance: formatCurrency(summary.totals.annualBalance),
      annualBalanceValue: summary.totals.annualBalance,
    },
    generatedAtLabel: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(summary.generatedAt),
  };
}
