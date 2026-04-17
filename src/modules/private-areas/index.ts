import { GetPrivateAreaListingUseCase } from "./application/get-private-area-listing.use-case";
import { PrismaPrivateAreaListingRepository } from "./infrastructure/prisma-private-area-listing.repository";

const privateAreaListingRepository = new PrismaPrivateAreaListingRepository();

export const getPrivateAreaListingUseCase = new GetPrivateAreaListingUseCase(
  privateAreaListingRepository,
);
