import { BudgetRepository } from "../domain/budget.repository";
import { BudgetStructureVM } from "../domain/budget-structure.types";

export class GetBudgetStructureUseCase {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  async execute(condominiumId: string, year: number): Promise<BudgetStructureVM> {
    return this.budgetRepository.getBudgetStructure(condominiumId, year);
  }
}
