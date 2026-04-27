import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaChargeRepository } from "./infrastructure/prisma-charge.repository";
import { PreviewMassChargesUseCase } from "./application/preview-mass-charges.use-case";
import { CreateMassChargesUseCase } from "./application/create-mass-charges.use-case";

export const chargeRepository = new PrismaChargeRepository(prisma);

export const previewMassChargesUseCase = new PreviewMassChargesUseCase(chargeRepository);
export const createMassChargesUseCase = new CreateMassChargesUseCase(chargeRepository);
