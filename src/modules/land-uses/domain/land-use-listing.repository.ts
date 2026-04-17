import type { LandUseListing } from "./land-use-listing";

export interface LandUseListingRepository {
  getListing(): Promise<LandUseListing | null>;
}
