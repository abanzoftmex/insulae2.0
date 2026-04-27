import { ExpenseRepository, SaveExpenseInput, ExpenseRecord } from "../domain/expense.repository";

export class UpdateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(id: string, input: SaveExpenseInput): Promise<ExpenseRecord> {
    if (input.amount < 0) throw new Error("Amount cannot be negative");
    if (!input.concept.trim()) throw new Error("Concept is required");
    
    return this.repository.update(id, input);
  }
}
