import { GetDirectoryContactParticipationUseCase } from "./application/get-directory-contact-participation.use-case";
import { GetDirectoryUseCase } from "./application/get-directory.use-case";
import { GetDirectoryRolesUseCase } from "./application/get-directory-roles.use-case";
import { UpdateDirectoryContactUseCase } from "./application/update-directory-contact.use-case";
import { PrismaDirectoryRepository } from "./infrastructure/prisma-directory.repository";

const directoryRepository = new PrismaDirectoryRepository();

export const getDirectoryUseCase = new GetDirectoryUseCase(directoryRepository);
export const getDirectoryContactParticipationUseCase =
	new GetDirectoryContactParticipationUseCase(directoryRepository);
export const getDirectoryRolesUseCase = new GetDirectoryRolesUseCase(directoryRepository);
export const updateDirectoryContactUseCase = new UpdateDirectoryContactUseCase(directoryRepository);
