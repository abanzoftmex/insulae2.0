import { PrismaBudgetRepository } from "./infrastructure/prisma-budget.repository";
import { GetBudgetByYearUseCase, UpdateBudgetMonthUseCase, ToggleBudgetStatusUseCase } from "./application/use-cases/budget.use-case";
import { ImportBudgetFromExcelUseCase } from "./application/use-cases/import-budget-from-excel.use-case";
import { GetBudgetStructureUseCase } from "./application/get-budget-structure.use-case";
import { DeleteBudgetGroupUseCase, DeleteBudgetConceptUseCase } from "./application/delete-budget-structure.use-case";

const budgetRepo = new PrismaBudgetRepository();

export const getBudgetByYearUseCase = new GetBudgetByYearUseCase(budgetRepo);
export const updateBudgetMonthUseCase = new UpdateBudgetMonthUseCase(budgetRepo);
export const toggleBudgetStatusUseCase = new ToggleBudgetStatusUseCase(budgetRepo);
export const importBudgetFromExcelUseCase = new ImportBudgetFromExcelUseCase(budgetRepo);
export const getBudgetStructureUseCase = new GetBudgetStructureUseCase(budgetRepo);
export const deleteBudgetGroupUseCase = new DeleteBudgetGroupUseCase(budgetRepo);
export const deleteBudgetConceptUseCase = new DeleteBudgetConceptUseCase(budgetRepo);

export * from "./domain/budget.types";
