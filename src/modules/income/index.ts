import { PrismaIncomeRepository } from "./infrastructure/prisma-income.repository";
import {
  ListIncomesUseCase,
  GetIncomeUseCase,
  CreateIncomeUseCase,
  UpdateIncomeUseCase,
  DeleteIncomeUseCase,
} from "./application/income.use-cases";

const repository = new PrismaIncomeRepository();

export const listIncomesUseCase = new ListIncomesUseCase(repository);
export const getIncomeUseCase = new GetIncomeUseCase(repository);
export const createIncomeUseCase = new CreateIncomeUseCase(repository);
export const updateIncomeUseCase = new UpdateIncomeUseCase(repository);
export const deleteIncomeUseCase = new DeleteIncomeUseCase(repository);

export * from "./domain/income.repository";
