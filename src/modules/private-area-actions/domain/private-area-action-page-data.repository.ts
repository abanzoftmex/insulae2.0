import type { PrivateAreaActionPageData } from "./private-area-action-page-data";

export interface PrivateAreaActionPageDataRepository {
  getById(privateAreaId: string): Promise<PrivateAreaActionPageData | null>;
}
