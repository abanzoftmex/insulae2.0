import type { FeeReportFilter, FeeReportListing } from "./fee-report";

export interface FeeReportRepository {
  getListing(filter: FeeReportFilter): Promise<FeeReportListing | null>;
}
