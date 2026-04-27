export * from "./domain/expense.repository";
export * from "./application/get-expense.use-case";
export * from "./application/create-expense.use-case";
export * from "./application/update-expense.use-case";
export * from "./application/delete-expense.use-case";
export * from "./infrastructure/prisma-expense.repository";

import { PrismaExpenseRepository } from "./infrastructure/prisma-expense.repository";
import { GetExpenseUseCase } from "./application/get-expense.use-case";
import { CreateExpenseUseCase } from "./application/create-expense.use-case";
import { UpdateExpenseUseCase } from "./application/update-expense.use-case";
import { DeleteExpenseUseCase } from "./application/delete-expense.use-case";

const expenseRepository = new PrismaExpenseRepository();

export const getExpenseUseCase = new GetExpenseUseCase(expenseRepository);
export const createExpenseUseCase = new CreateExpenseUseCase(expenseRepository);
export const updateExpenseUseCase = new UpdateExpenseUseCase(expenseRepository);
export const deleteExpenseUseCase = new DeleteExpenseUseCase(expenseRepository);
