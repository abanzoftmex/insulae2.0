import { BudgetRepository } from "../../domain/budget.repository";
import { BudgetVM } from "../../domain/budget.types";

export class GetBudgetByYearUseCase {
  constructor(private readonly repo: BudgetRepository) {}

  async execute(condominiumId: string, year: number): Promise<BudgetVM> {
    const budgetId = await this.repo.createBudgetIfNotExists(condominiumId, year);
    // get it out
    return this.repo.getBudget(condominiumId, year);
  }
}

export class UpdateBudgetMonthUseCase {
  constructor(private readonly repo: BudgetRepository) {}

  async execute(condominiumId: string, year: number, budgetMonthId: string, amount: number): Promise<void> {
    const b = await this.repo.getBudget(condominiumId, year);
    if (b.status !== "OPEN") {
      throw new Error("El presupuesto está cerrado y no se puede editar");
    }
    await this.repo.updateMonthAmount(budgetMonthId, amount);
  }
}

export class ToggleBudgetStatusUseCase {
  constructor(private readonly repo: BudgetRepository) {}
  async execute(budgetId: string): Promise<void> {
    await this.repo.toggleBudgetStatus(budgetId);
  }
}
