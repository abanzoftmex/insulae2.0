import type { ZoneListing } from "./zone-listing";

export interface ZoneListingRepository {
  getListing(): Promise<ZoneListing | null>;
}
