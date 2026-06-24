import { BudgetStatus } from "@prisma/client";

export interface BudgetMonthVM {
  month: number;          // 1-12
  budgetMonthId?: string; // Si ya existe en DB, id del registro
  budgeted: number;       // monto de budgetMonth
  generated: number;      // sum(Expense) de ese mes
  units: number | null;   // unidades para ese mes
}

export interface BudgetConceptRowVM {
  conceptId: string; // id de BudgetExpenseConcept
  conceptName: string;
  legacyConceptId: number | null;
  budgetLineId?: string; // id de BudgetLine si existe

  unitCost: number | null; // costo unitario
  supplierUrl: string | null; // url del proveedor/documento

  budgeted: number;  // suma de meses
  generated: number; // suma de expenses
  balance: number;   // budgeted - generated

  months: BudgetMonthVM[];
}

export interface BudgetGroupVM {
  groupId: string;        // clave única (id del BudgetGroup o fallback legacy)
  groupData: string;      // nombre principal del grupo (name)
  groupSubname?: string;  // subnombre (category) cuando aporta información
  budgeted: number;
  generated: number;
  balance: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  concepts: BudgetConceptRowVM[];
}

export interface BudgetSummaryCardVM {
  title: string;
  subtitle?: string;      // subnombre (category) cuando aporta información
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
