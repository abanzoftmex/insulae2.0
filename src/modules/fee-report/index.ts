import { GetFeeReportUseCase } from "./application/get-fee-report.use-case";
import { PrismaFeeReportRepository } from "./infrastructure/prisma-fee-report.repository";

export { toFeeReportListingVM, toExtraordinaryFeeReportListingVM } from "./presentation/fee-report.vm";
export type { FeeReportListingVM, FeeReportRowVM, FeeReportColumnHeader, FeeReportCellVM, FeeReportExtraordinaryListingVM, FeeReportExtraordinaryRowVM } from "./presentation/fee-report.vm";

const repository = new PrismaFeeReportRepository();

export const getFeeReportUseCase = new GetFeeReportUseCase(repository);
