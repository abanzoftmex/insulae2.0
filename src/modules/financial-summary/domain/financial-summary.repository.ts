import type { FinancialSummary, FinancialSummaryInput } from "./financial-summary";

export interface FinancialSummaryRepository {
  getSummary(input: FinancialSummaryInput): Promise<FinancialSummary | null>;
}
