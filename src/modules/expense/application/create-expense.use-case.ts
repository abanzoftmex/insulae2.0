import { ExpenseRepository, SaveExpenseInput, ExpenseRecord } from "../domain/expense.repository";

export class CreateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(condominiumId: string, input: SaveExpenseInput): Promise<ExpenseRecord> {
    if (input.amount < 0) throw new Error("Amount cannot be negative");
    if (!input.concept.trim()) throw new Error("Concept is required");
    
    return this.repository.create(condominiumId, input);
  }
}
