import type {
  PrivateAreaListing,
  PrivateAreaListingFilters,
} from "./private-area-listing";

export interface PrivateAreaListingRepository {
  getListing(filters: PrivateAreaListingFilters): Promise<PrivateAreaListing | null>;
}
