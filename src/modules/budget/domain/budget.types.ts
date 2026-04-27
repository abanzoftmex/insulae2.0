import { BudgetStatus, ExpenseBudgetGroup } from "@prisma/client";

export interface BudgetMonthVM {
  month: number;          // 1-12
  budgetMonthId?: string; // Si ya existe en DB, id del registro
  budgeted: number;       // monto de budgetMonth
  generated: number;      // sum(Expense) de ese mes
}

export interface BudgetConceptRowVM {
  conceptId: string; // id de BudgetExpenseConcept
  conceptName: string;
  legacyConceptId: number | null;
  budgetLineId?: string; // id de BudgetLine si existe

  budgeted: number;  // suma de meses
  generated: number; // suma de expenses
  balance: number;   // budgeted - generated

  months: BudgetMonthVM[];
}

export interface BudgetGroupVM {
  groupData: ExpenseBudgetGroup;
  budgeted: number;
  generated: number;
  balance: number;
  concepts: BudgetConceptRowVM[];
}

export interface BudgetSummaryCardVM {
  title: string;
  budgeted: number;
  generated: number;
}

export interface BudgetVM {
  id?: string;
  condominiumId: string;
  year: number;
  status: BudgetStatus;
  
  totalBudgeted: number;
  totalGenerated: number;
  totalBalance: number;

  summaryCards: BudgetSummaryCardVM[];
  groups: BudgetGroupVM[];
}

// Interfaces de Excel Import
export interface BudgetExcelRow {
  legacyConceptId: number;
  conceptName?: string;
  // months 1..12
  jan: number; feb: number; mar: number; apr: number;
  may: number; jun: number; jul: number; aug: number;
  sep: number; oct: number; nov: number; dec: number;
}
