import { GetCondominiumOverviewUseCase } from "./application/get-condominium-overview.use-case";
import { PrismaCondominiumOverviewRepository } from "./infrastructure/prisma-condominium-overview.repository";

const condominiumOverviewRepository = new PrismaCondominiumOverviewRepository();

export const getCondominiumOverviewUseCase = new GetCondominiumOverviewUseCase(
  condominiumOverviewRepository,
);
