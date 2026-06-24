

export interface BudgetGroupVM {
  id: string;
  name: string;
  year: number;
  category: string;
  isActive: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  concepts: BudgetConceptShortVM[];
}

export interface BudgetConceptShortVM {
  id: string;
  name: string;
  order: number;
  type: string;
  isActive: boolean;
}

export interface BudgetStructureVM {
  groups: BudgetGroupVM[];
  year: number;
}
