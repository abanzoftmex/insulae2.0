import { GetCondominiumOrganigramUseCase } from "./application/get-condominium-organigram.use-case";
import { SaveCondominiumOrganigramUseCase } from "./application/save-condominium-organigram.use-case";
import { PrismaCondominiumOrganigramRepository } from "./infrastructure/prisma-condominium-organigram.repository";

const repository = new PrismaCondominiumOrganigramRepository();

export const getCondominiumOrganigramUseCase = new GetCondominiumOrganigramUseCase(repository);
export const saveCondominiumOrganigramUseCase = new SaveCondominiumOrganigramUseCase(repository);

export { PrismaCondominiumOrganigramRepository };
