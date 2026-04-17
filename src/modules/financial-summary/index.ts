import { GetFinancialSummaryUseCase } from "./application/get-financial-summary.use-case";
import { PrismaFinancialSummaryRepository } from "./infrastructure/prisma-financial-summary.repository";

export { toFinancialSummaryVM } from "./presentation/financial-summary.vm";

const repository = new PrismaFinancialSummaryRepository();

export const getFinancialSummaryUseCase = new GetFinancialSummaryUseCase(repository);
