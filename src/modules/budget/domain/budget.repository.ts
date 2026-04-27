import { BudgetVM } from "./budget.types";
import { BudgetStructureVM } from "./budget-structure.types";

export interface BudgetRepository {
  getBudget(condominiumId: string, year: number): Promise<BudgetVM>;
  updateMonthAmount(budgetMonthId: string, amount: number): Promise<void>;
  createMonthAmount(budgetId: string, budgetConceptId: string, month: number, amount: number): Promise<void>;
  toggleBudgetStatus(budgetId: string): Promise<void>;
  createBudgetIfNotExists(condominiumId: string, year: number): Promise<string>;
  getBudgetStructure(condominiumId: string, year: number): Promise<BudgetStructureVM>;
  getBudgetGroupById(id: string): Promise<any>;
  getCondominiumBudgetGroups(condominiumId: string, year: number): Promise<any[]>;
  saveBudgetGroup(data: any): Promise<void>;
  deleteBudgetGroup(groupId: string): Promise<void>;
  deleteBudgetConcept(conceptId: string): Promise<void>;
}
