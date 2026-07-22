import type { StatisticsFilters, StatisticsReport, StatisticsRepository } from "../domain/statistics";
import { prismaStatisticsRepository } from "../infrastructure/prisma-statistics.repository";

export class GetStatisticsUseCase {
  constructor(private readonly repository: StatisticsRepository) {}

  execute(filters: StatisticsFilters): Promise<StatisticsReport | null> {
    return this.repository.getReport(filters);
  }
}

export const getStatisticsUseCase = new GetStatisticsUseCase(prismaStatisticsRepository);
