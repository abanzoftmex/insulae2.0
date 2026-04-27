import { ExpenseRepository } from "../domain/expense.repository";

export class DeleteExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.hardDelete(id);
  }
}
