import { GetCondominiumReportUseCase } from "./application/get-condominium-report.use-case";
import { PrismaCondominiumReportRepository } from "./infrastructure/prisma-condominium-report.repository";

const condominiumReportRepository = new PrismaCondominiumReportRepository();

export const getCondominiumReportUseCase = new GetCondominiumReportUseCase(
  condominiumReportRepository,
);
