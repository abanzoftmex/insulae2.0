import type { UseCase } from "@/shared/application/use-case";

import type { FeeReportFilter, FeeReportListing } from "../domain/fee-report";
import type { FeeReportRepository } from "../domain/fee-report.repository";

export class GetFeeReportUseCase
  implements UseCase<FeeReportFilter, FeeReportListing | null>
{
  constructor(private readonly repository: FeeReportRepository) {}

  async execute(filter: FeeReportFilter): Promise<FeeReportListing | null> {
    return this.repository.getListing(filter);
  }
}
