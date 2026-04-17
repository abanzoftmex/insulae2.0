import { DeleteCondominiumStructureGroupUseCase } from "./application/delete-condominium-structure-group.use-case";
import { GetCondominiumStructureFormUseCase } from "./application/get-condominium-structure-form.use-case";
import { GetCondominiumStructureListingUseCase } from "./application/get-condominium-structure-listing.use-case";
import { GetCondominiumStructureFormTemplateUseCase } from "./application/get-condominium-structure-form-template.use-case";
import { SaveCondominiumStructureUseCase } from "./application/save-condominium-structure.use-case";
import { PrismaCondominiumStructureFormRepository } from "./infrastructure/prisma-condominium-structure-form.repository";
import { PrismaCondominiumStructureListingRepository } from "./infrastructure/prisma-condominium-structure-listing.repository";

const listingRepository = new PrismaCondominiumStructureListingRepository();
const formRepository = new PrismaCondominiumStructureFormRepository();

export const getCondominiumStructureListingUseCase = new GetCondominiumStructureListingUseCase(
  listingRepository,
);
export const getCondominiumStructureFormTemplateUseCase =
  new GetCondominiumStructureFormTemplateUseCase(formRepository);
export const getCondominiumStructureFormUseCase = new GetCondominiumStructureFormUseCase(formRepository);
export const saveCondominiumStructureUseCase = new SaveCondominiumStructureUseCase(formRepository);
export const deleteCondominiumStructureGroupUseCase = new DeleteCondominiumStructureGroupUseCase(
  formRepository,
);

export { PrismaCondominiumStructureFormRepository };
