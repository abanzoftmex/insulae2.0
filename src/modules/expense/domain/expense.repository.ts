export interface ExpenseRecord {
  id: string;
  date: Date;
  concept: string;
  amount: number;
  paymentMethod: string | null;
  notes: string | null;
  receiptUrl: string | null;
  projectName: string | null;
  isActive: boolean;
  budgetConceptId: string | null;
  budgetConceptName: string | null;
  budgetGroupName: string | null;
}

export interface ExpenseListFilter {
  condominiumId: string;
  search?: string;
  budgetConceptId?: string;
  paymentMethod?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SaveExpenseInput {
  id?: string;
  date: Date;
  concept: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  receiptUrl?: string | null;
  projectName?: string | null;
  budgetConceptId?: string | null;
}

export interface ExpenseRepository {
  findAll(filter: ExpenseListFilter): Promise<ExpenseRecord[]>;
  findById(id: string): Promise<ExpenseRecord | null>;
  create(condominiumId: string, input: SaveExpenseInput): Promise<ExpenseRecord>;
  update(id: string, input: SaveExpenseInput): Promise<ExpenseRecord>;
  hardDelete(id: string): Promise<void>;
}
