import { ArchiveRegulationDocumentUseCase } from "./application/archive-regulation-document.use-case";
import { CreateRegulationDocumentUseCase } from "./application/create-regulation-document.use-case";
import { GetRegulationDirectoryUseCase } from "./application/get-regulation-directory.use-case";
import { UpdateRegulationDocumentUseCase } from "./application/update-regulation-document.use-case";
import { PrismaRegulationDirectoryRepository } from "./infrastructure/prisma-regulation-directory.repository";

const regulationDirectoryRepository = new PrismaRegulationDirectoryRepository();

export const getRegulationDirectoryUseCase = new GetRegulationDirectoryUseCase(
  regulationDirectoryRepository,
);

export const createRegulationDocumentUseCase = new CreateRegulationDocumentUseCase(
  regulationDirectoryRepository,
);

export const updateRegulationDocumentUseCase = new UpdateRegulationDocumentUseCase(
  regulationDirectoryRepository,
);

export const archiveRegulationDocumentUseCase = new ArchiveRegulationDocumentUseCase(
  regulationDirectoryRepository,
);
