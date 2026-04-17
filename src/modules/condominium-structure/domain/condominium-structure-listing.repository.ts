import type { CondominiumStructureListing } from "./condominium-structure-listing";

export interface CondominiumStructureListingRepository {
  getListing(): Promise<CondominiumStructureListing | null>;
}
