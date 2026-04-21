export interface FinancialSummaryMonth {
  month: number;
  ordinaryIncome: number;
  extraordinaryIncome: number;
  otherIncome: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface FinancialSummaryTotals {
  ordinaryIncome: number;
  extraordinaryIncome: number;
  otherIncome: number;
  totalIncome: number;
  totalExpenses: number;
  annualBalance: number;
}

export interface FinancialSummaryTableRow {
  id: string;
  label: string;
  annualTotal: number;
  months: number[];
  isTotal?: boolean;
}

export interface FinancialSummaryTable {
  id: string;
  title: string;
  rows: FinancialSummaryTableRow[];
}

export interface FinancialSummaryBlock {
  id: string;
  title: string;
  tables: FinancialSummaryTable[];
}

export interface FinancialSummaryYearSlice {
  year: number;
  annualTotal: number;
  months: number[];
}

export interface FinancialSummaryMultiYearTableRow {
  id: string;
  label: string;
  yearly: FinancialSummaryYearSlice[];
  isTotal?: boolean;
}

export interface FinancialSummaryMultiYearTable {
  id: string;
  title: string;
  years: number[];
  rows: FinancialSummaryMultiYearTableRow[];
}

export interface FinancialSummaryOrdinaryReceivableRow {
  id: string;
  label: string;
  periodCurrentYear: number;
  overduePortfolio: number | null;
  monthsCurrentYear: number[];
  periodNextYear: number;
  monthsNextYear: number[];
  isTotal?: boolean;
}

export interface FinancialSummaryOrdinaryReceivableTable {
  id: string;
  title: string;
  currentYear: number;
  nextYear: number;
  overdueStartYear: number;
  overdueEndYear: number;
  rows: FinancialSummaryOrdinaryReceivableRow[];
}

export interface FinancialSummaryOrdinaryPayableRow {
  id: string;
  label: string;
  periodCurrentYear: number;
  monthsCurrentYear: number[];
  totalAnnualNextYear: number;
  periodNextYear: number;
  monthsNextYear: number[];
}

export interface FinancialSummaryOrdinaryPayableTable {
  id: string;
  title: string;
  currentYear: number;
  nextYear: number;
  rows: FinancialSummaryOrdinaryPayableRow[];
}

export interface FinancialSummary {
  condominiumName: string;
  condominiumSlug: string;
  year: number;
  availableYears: number[];
  months: FinancialSummaryMonth[];
  totals: FinancialSummaryTotals;
  blocks: FinancialSummaryBlock[];
  ordinaryIncomeMultiYearTable: FinancialSummaryMultiYearTable;
  extraordinaryIncomeMultiYearTable: FinancialSummaryMultiYearTable;
  ordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTable;
  extraordinaryOtherIncomeMultiYearTable: FinancialSummaryMultiYearTable;
  extraordinaryExpensesMultiYearTable: FinancialSummaryMultiYearTable;
  extraordinaryBalanceMultiYearTable: FinancialSummaryMultiYearTable;
  extraordinaryReceivablesMultiYearTable: FinancialSummaryMultiYearTable;
  extraordinaryPayablesMultiYearTable: FinancialSummaryMultiYearTable;
  ordinaryExpensesLegacyTable: FinancialSummaryMultiYearTable;
  ordinaryReceivablesTable: FinancialSummaryOrdinaryReceivableTable;
  ordinaryPayablesTable: FinancialSummaryOrdinaryPayableTable;
  generatedAt: Date;
}

export interface FinancialSummaryInput {
  year: number;
}
