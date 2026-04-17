import type { CondominiumOverview } from "./condominium-overview";

export interface CondominiumOverviewRepository {
  getOverview(): Promise<CondominiumOverview | null>;
}
