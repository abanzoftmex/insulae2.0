import type { FinancialSummary } from "../domain/financial-summary";

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
  monthLabels: string[];
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
  return {
    condominiumName: summary.condominiumName,
    condominiumSlug: summary.condominiumSlug,
    selectedYear: summary.year,
    availableYears: summary.availableYears,
    monthLabels: MONTH_LABELS,
    months: summary.months.map((month) => ({
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
    blocks: summary.blocks.map((block) => ({
      id: block.id,
      title: block.title,
      tables: block.tables.map((table) => ({
        id: table.id,
        title: table.title,
        rows: table.rows.map((row) => ({
          id: row.id,
          label: row.label,
          months: row.months.map((value) => formatCurrency(value)),
          monthsValue: row.months,
          annualTotal: formatCurrency(row.annualTotal),
          annualTotalValue: row.annualTotal,
          isTotal: row.isTotal ?? false,
        })),
      })),
    })),
    ordinaryIncomeMultiYearTable: {
      id: summary.ordinaryIncomeMultiYearTable.id,
      title: summary.ordinaryIncomeMultiYearTable.title,
      years: summary.ordinaryIncomeMultiYearTable.years,
      rows: summary.ordinaryIncomeMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    extraordinaryIncomeMultiYearTable: {
      id: summary.extraordinaryIncomeMultiYearTable.id,
      title: summary.extraordinaryIncomeMultiYearTable.title,
      years: summary.extraordinaryIncomeMultiYearTable.years,
      rows: summary.extraordinaryIncomeMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    ordinaryOtherIncomeMultiYearTable: {
      id: summary.ordinaryOtherIncomeMultiYearTable.id,
      title: summary.ordinaryOtherIncomeMultiYearTable.title,
      years: summary.ordinaryOtherIncomeMultiYearTable.years,
      rows: summary.ordinaryOtherIncomeMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    extraordinaryOtherIncomeMultiYearTable: {
      id: summary.extraordinaryOtherIncomeMultiYearTable.id,
      title: summary.extraordinaryOtherIncomeMultiYearTable.title,
      years: summary.extraordinaryOtherIncomeMultiYearTable.years,
      rows: summary.extraordinaryOtherIncomeMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    extraordinaryExpensesMultiYearTable: {
      id: summary.extraordinaryExpensesMultiYearTable.id,
      title: summary.extraordinaryExpensesMultiYearTable.title,
      years: summary.extraordinaryExpensesMultiYearTable.years,
      rows: summary.extraordinaryExpensesMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    extraordinaryBalanceMultiYearTable: {
      id: summary.extraordinaryBalanceMultiYearTable.id,
      title: summary.extraordinaryBalanceMultiYearTable.title,
      years: summary.extraordinaryBalanceMultiYearTable.years,
      rows: summary.extraordinaryBalanceMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    extraordinaryReceivablesMultiYearTable: {
      id: summary.extraordinaryReceivablesMultiYearTable.id,
      title: summary.extraordinaryReceivablesMultiYearTable.title,
      years: summary.extraordinaryReceivablesMultiYearTable.years,
      rows: summary.extraordinaryReceivablesMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    extraordinaryPayablesMultiYearTable: {
      id: summary.extraordinaryPayablesMultiYearTable.id,
      title: summary.extraordinaryPayablesMultiYearTable.title,
      years: summary.extraordinaryPayablesMultiYearTable.years,
      rows: summary.extraordinaryPayablesMultiYearTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
    ordinaryExpensesLegacyTable: {
      id: summary.ordinaryExpensesLegacyTable.id,
      title: summary.ordinaryExpensesLegacyTable.title,
      years: summary.ordinaryExpensesLegacyTable.years,
      rows: summary.ordinaryExpensesLegacyTable.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isTotal: row.isTotal ?? false,
        yearly: row.yearly.map((yearSlice) => ({
          year: yearSlice.year,
          annualTotal: formatCurrency(yearSlice.annualTotal),
          annualTotalValue: yearSlice.annualTotal,
          months: yearSlice.months.map((value) => formatCurrency(value)),
          monthsValue: yearSlice.months,
        })),
      })),
    },
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
        monthsCurrentYear: row.monthsCurrentYear.map((value) => formatCurrency(value)),
        monthsCurrentYearValue: row.monthsCurrentYear,
        periodNextYear: formatCurrency(row.periodNextYear),
        periodNextYearValue: row.periodNextYear,
        monthsNextYear: row.monthsNextYear.map((value) => formatCurrency(value)),
        monthsNextYearValue: row.monthsNextYear,
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
        monthsCurrentYear: row.monthsCurrentYear.map((value) => formatCurrency(value)),
        monthsCurrentYearValue: row.monthsCurrentYear,
        totalAnnualNextYear: formatCurrency(row.totalAnnualNextYear),
        totalAnnualNextYearValue: row.totalAnnualNextYear,
        periodNextYear: formatCurrency(row.periodNextYear),
        periodNextYearValue: row.periodNextYear,
        monthsNextYear: row.monthsNextYear.map((value) => formatCurrency(value)),
        monthsNextYearValue: row.monthsNextYear,
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
