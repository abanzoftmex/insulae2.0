import type { CondominiumStructureListing } from "../domain/condominium-structure-listing";
import type { CondominiumStructureListingRepository } from "../domain/condominium-structure-listing.repository";

export class GetCondominiumStructureListingUseCase {
  constructor(private readonly repository: CondominiumStructureListingRepository) {}

  async execute(): Promise<CondominiumStructureListing | null> {
    return this.repository.getListing();
  }
}
