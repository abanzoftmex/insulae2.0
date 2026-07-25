import type { KpiDetail, KpiKey, StatisticsFilters, StatisticsRepository } from "../domain/statistics";
import { prismaStatisticsRepository } from "../infrastructure/prisma-statistics.repository";

export class GetKpiDetailUseCase {
  constructor(private readonly repository: StatisticsRepository) {}

  execute(key: KpiKey, filters: StatisticsFilters): Promise<KpiDetail | null> {
    return this.repository.getKpiDetail(key, filters);
  }
}

export const getKpiDetailUseCase = new GetKpiDetailUseCase(prismaStatisticsRepository);
