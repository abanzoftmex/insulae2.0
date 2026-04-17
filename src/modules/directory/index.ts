import { GetDirectoryContactParticipationUseCase } from "./application/get-directory-contact-participation.use-case";
import { GetDirectoryUseCase } from "./application/get-directory.use-case";
import { PrismaDirectoryRepository } from "./infrastructure/prisma-directory.repository";

const directoryRepository = new PrismaDirectoryRepository();

export const getDirectoryUseCase = new GetDirectoryUseCase(directoryRepository);
export const getDirectoryContactParticipationUseCase =
	new GetDirectoryContactParticipationUseCase(directoryRepository);
