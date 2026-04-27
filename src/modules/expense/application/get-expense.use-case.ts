import { ExpenseRepository, ExpenseListFilter, ExpenseRecord } from "../domain/expense.repository";

export class GetExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async findAll(filter: ExpenseListFilter): Promise<ExpenseRecord[]> {
    return this.repository.findAll(filter);
  }

  async findById(id: string): Promise<ExpenseRecord | null> {
    return this.repository.findById(id);
  }
}
