import { GetZoneListingUseCase } from "./application/get-zone-listing.use-case";
import { GetZoneFormUseCase } from "./application/get-zone-form.use-case";
import { SaveZoneUseCase } from "./application/save-zone.use-case";
import { PrismaZoneFormRepository } from "./infrastructure/prisma-zone-form.repository";
import { PrismaZoneListingRepository } from "./infrastructure/prisma-zone-listing.repository";

const zoneListingRepository = new PrismaZoneListingRepository();
const zoneFormRepository = new PrismaZoneFormRepository();

export const getZoneListingUseCase = new GetZoneListingUseCase(zoneListingRepository);
export const getZoneFormUseCase = new GetZoneFormUseCase(zoneFormRepository);
export const saveZoneUseCase = new SaveZoneUseCase(zoneFormRepository);
