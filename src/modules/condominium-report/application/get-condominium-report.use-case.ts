import type { UseCase } from "@/shared/application/use-case";

import type { CondominiumReport } from "../domain/condominium-report";
import type { CondominiumReportRepository } from "../domain/condominium-report.repository";

export class GetCondominiumReportUseCase
  implements UseCase<void, CondominiumReport | null>
{
  constructor(private readonly repository: CondominiumReportRepository) {}

  async execute(): Promise<CondominiumReport | null> {
    return this.repository.getReport();
  }
}
