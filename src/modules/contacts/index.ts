import { GetContactDirectoryUseCase } from "./application/get-contact-directory.use-case";
import { PrismaContactDirectoryRepository } from "./infrastructure/prisma-contact-directory.repository";

const contactDirectoryRepository = new PrismaContactDirectoryRepository();

export const getContactDirectoryUseCase = new GetContactDirectoryUseCase(
  contactDirectoryRepository,
);
