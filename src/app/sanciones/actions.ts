"use server";

import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { PrismaSanctionRepository } from "@/modules/sanction/infrastructure/prisma-sanction.repository";
import { CreateSanctionUseCase, UpdateSanctionUseCase, DeleteSanctionUseCase } from "@/modules/sanction/application/sanction.use-cases";
import { revalidatePath } from "next/cache";
import { CreateSanctionRequest, UpdateSanctionRequest } from "@/modules/sanction/domain/sanction.types";

const repository = new PrismaSanctionRepository(prisma);

export async function createSanctionAction(req: Omit<CreateSanctionRequest, "condominiumId">) {
  try {
    const condominium = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condominium) throw new Error("Condominium not found");

    const useCase = new CreateSanctionUseCase(repository);
    await useCase.execute({
      ...req,
      condominiumId: condominium.id,
    });
    revalidatePath("/sanciones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create sanction", error);
    return { success: false, error: error.message || "Failed to create sanction" };
  }
}

export async function updateSanctionAction(req: Omit<UpdateSanctionRequest, "condominiumId">) {
  try {
    const condominium = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condominium) throw new Error("Condominium not found");

    const useCase = new UpdateSanctionUseCase(repository);
    await useCase.execute({
      ...req,
      condominiumId: condominium.id,
    });
    revalidatePath("/sanciones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update sanction", error);
    return { success: false, error: error.message || "Failed to update sanction" };
  }
}

export async function deleteSanctionAction(id: string) {
  try {
    const condominium = await prisma.condominium.findFirst({ where: { isActive: true } });
    if (!condominium) throw new Error("Condominium not found");

    const useCase = new DeleteSanctionUseCase(repository);
    await useCase.execute(id, condominium.id);
    revalidatePath("/sanciones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete sanction", error);
    return { success: false, error: error.message || "Failed to delete sanction" };
  }
}
