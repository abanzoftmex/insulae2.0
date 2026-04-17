import type { UseCase } from "@/shared/application/use-case";

import type {
  FinancialSummary,
  FinancialSummaryInput,
} from "../domain/financial-summary";
import type { FinancialSummaryRepository } from "../domain/financial-summary.repository";

export class GetFinancialSummaryUseCase
  implements UseCase<FinancialSummaryInput, FinancialSummary | null>
{
  constructor(private readonly repository: FinancialSummaryRepository) {}

  async execute(input: FinancialSummaryInput): Promise<FinancialSummary | null> {
    return this.repository.getSummary(input);
  }
}
