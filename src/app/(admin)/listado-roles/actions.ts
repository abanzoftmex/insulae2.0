"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

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
    await assertPermission(MODULES.ROLES, "canCreate");
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
    await assertPermission(MODULES.ROLES, "canUpdate");
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
    await assertPermission(MODULES.ROLES, "canDelete");
    const useCase = new DeleteRoleUseCase(repository);
    await useCase.execute(id, condominiumId);
    revalidatePath("/listado-roles");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
