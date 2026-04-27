import { ExpenseBudgetGroup } from "@prisma/client";

export interface BudgetGroupVM {
  id: string;
  name: string;
  year: number;
  category: ExpenseBudgetGroup;
  isActive: boolean;
  concepts: BudgetConceptShortVM[];
}

export interface BudgetConceptShortVM {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BudgetStructureVM {
  groups: BudgetGroupVM[];
  year: number;
}
