import type { UseCase } from "@/shared/application/use-case";
import type { CondominiumOverview } from "../domain/condominium-overview";
import type { CondominiumOverviewRepository } from "../domain/condominium-overview.repository";

export class GetCondominiumOverviewUseCase
  implements UseCase<void, CondominiumOverview | null>
{
  constructor(private readonly repository: CondominiumOverviewRepository) {}

  async execute(): Promise<CondominiumOverview | null> {
    return this.repository.getOverview();
  }
}
