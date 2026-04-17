import type { UseCase } from "@/shared/application/use-case";

import type { LandUseListing } from "../domain/land-use-listing";
import type { LandUseListingRepository } from "../domain/land-use-listing.repository";

export class GetLandUseListingUseCase implements UseCase<void, LandUseListing | null> {
  constructor(private readonly repository: LandUseListingRepository) {}

  async execute(): Promise<LandUseListing | null> {
    return this.repository.getListing();
  }
}
