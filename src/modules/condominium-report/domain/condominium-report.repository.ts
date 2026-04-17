import type { CondominiumReport } from "./condominium-report";

export interface CondominiumReportRepository {
  getReport(): Promise<CondominiumReport | null>;
}
