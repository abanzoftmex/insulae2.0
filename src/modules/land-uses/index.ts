import { GetLandUseFormTemplateUseCase } from "./application/get-land-use-form-template.use-case";
import { GetLandUseFormUseCase } from "./application/get-land-use-form.use-case";
import { GetLandUseListingUseCase } from "./application/get-land-use-listing.use-case";
import { SaveLandUseUseCase } from "./application/save-land-use.use-case";
import { PrismaLandUseFormRepository } from "./infrastructure/prisma-land-use-form.repository";
import { PrismaLandUseListingRepository } from "./infrastructure/prisma-land-use-listing.repository";

const landUseListingRepository = new PrismaLandUseListingRepository();
const landUseFormRepository = new PrismaLandUseFormRepository();

export const getLandUseListingUseCase = new GetLandUseListingUseCase(landUseListingRepository);
export const getLandUseFormTemplateUseCase = new GetLandUseFormTemplateUseCase(landUseFormRepository);
export const getLandUseFormUseCase = new GetLandUseFormUseCase(landUseFormRepository);
export const saveLandUseUseCase = new SaveLandUseUseCase(landUseFormRepository);
