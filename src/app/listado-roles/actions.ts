"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import {
  CreateRoleUseCase,
  UpdateRoleUseCase,
  DeleteRoleUseCase,
} from "@/modules/role/application/role.use-cases";
import { CreateRoleRequest, UpdateRoleRequest } from "@/modules/role/domain/role.types";

const repository = new PrismaRoleRepository(prisma);

export async function createRoleAction(req: CreateRoleRequest) {
  try {
    const useCase = new CreateRoleUseCase(repository);
    await useCase.execute(req);
    revalidatePath("/listado-roles");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRoleAction(req: UpdateRoleRequest) {
  try {
    const useCase = new UpdateRoleUseCase(repository);
    await useCase.execute(req);
    revalidatePath("/listado-roles");
    revalidatePath(`/listado-roles/${req.id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteRoleAction(id: string, condominiumId: string) {
  try {
    const useCase = new DeleteRoleUseCase(repository);
    await useCase.execute(id, condominiumId);
    revalidatePath("/listado-roles");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
