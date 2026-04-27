import { BudgetRepository } from "../domain/budget.repository";

export class DeleteBudgetGroupUseCase {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  async execute(groupId: string): Promise<void> {
    await this.budgetRepository.deleteBudgetGroup(groupId);
  }
}

export class DeleteBudgetConceptUseCase {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  async execute(conceptId: string): Promise<void> {
    await this.budgetRepository.deleteBudgetConcept(conceptId);
  }
}
