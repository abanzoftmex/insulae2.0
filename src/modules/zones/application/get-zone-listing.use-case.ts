import type { UseCase } from "@/shared/application/use-case";

import type { ZoneListing } from "../domain/zone-listing";
import type { ZoneListingRepository } from "../domain/zone-listing.repository";

export class GetZoneListingUseCase implements UseCase<void, ZoneListing | null> {
  constructor(private readonly repository: ZoneListingRepository) {}

  async execute(): Promise<ZoneListing | null> {
    return this.repository.getListing();
  }
}
