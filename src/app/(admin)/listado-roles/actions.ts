"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { readAdminSession } from "@/shared/application/auth/permissions";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import {
  CreateRoleUseCase,
  UpdateRoleUseCase,
  UpdateRoleColorUseCase,
  DeleteRoleUseCase,
  GetRoleDeactivationImpactUseCase,
  DeactivateRoleUseCase,
} from "@/modules/role/application/role.use-cases";
import type {
  CreateRoleRequest,
  UpdateRoleRequest,
  UpdateRoleColorRequest,
  RoleDeactivationImpact,
  DeactivateRoleResult,
} from "@/modules/role/domain/role.types";

const repository = new PrismaRoleRepository(prisma);

export async function createRoleAction(req: CreateRoleRequest) {
  try {
    await assertPermission(MODULES.ROLES, "canCreate");
    const useCase = new CreateRoleUseCase(repository);
    await useCase.execute(req);
    revalidatePath("/listado-roles");
    revalidatePath("/directorio");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error al crear el rol.",
    };
  }
}

export async function updateRoleAction(req: UpdateRoleRequest) {
  try {
    await assertPermission(MODULES.ROLES, "canUpdate");
    const useCase = new UpdateRoleUseCase(repository);
    await useCase.execute(req);
    revalidatePath("/listado-roles");
    revalidatePath(`/listado-roles/${req.id}`);
    revalidatePath("/directorio");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error al actualizar el rol.",
    };
  }
}

export async function updateRoleColorAction(req: UpdateRoleColorRequest) {
  try {
    await assertPermission(MODULES.ROLES, "canUpdate");
    const useCase = new UpdateRoleColorUseCase(repository);
    await useCase.execute(req);
    revalidatePath("/listado-roles");
    revalidatePath(`/listado-roles/${req.id}`);
    revalidatePath("/directorio");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error al actualizar el color del rol.",
    };
  }
}

export async function deleteRoleAction(id: string, condominiumId: string) {
  try {
    await assertPermission(MODULES.ROLES, "canDelete");
    const session = await readAdminSession();
    if (!session) {
      return { success: false, error: "No hay una sesión administrativa activa." };
    }
    const useCase = new DeleteRoleUseCase(repository);
    await useCase.execute(id, condominiumId, session.userId);
    revalidatePath("/listado-roles");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error al eliminar el rol.",
    };
  }
}

export async function getRoleDeactivationImpactAction(
  roleId: string,
  condominiumId: string
): Promise<
  { success: true; impact: RoleDeactivationImpact } | { success: false; error: string }
> {
  try {
    await assertPermission(MODULES.ROLES, "canUpdate");
    await assertPermission(MODULES.ROLES, "canDelete");
    const session = await readAdminSession();
    if (!session) {
      return { success: false, error: "No hay una sesión administrativa activa." };
    }
    if (!roleId?.trim() || !condominiumId?.trim()) {
      return { success: false, error: "Identificador de rol o condominio inválido." };
    }

    const useCase = new GetRoleDeactivationImpactUseCase(repository);
    const impact = await useCase.execute(roleId, condominiumId, session.userId);
    return { success: true, impact };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo consultar el impacto de desactivación del rol.",
    };
  }
}

export async function deactivateRoleAction(
  roleId: string,
  condominiumId: string
): Promise<
  { success: true; data: DeactivateRoleResult } | { success: false; error: string }
> {
  try {
    await assertPermission(MODULES.ROLES, "canUpdate");
    await assertPermission(MODULES.ROLES, "canDelete");
    const session = await readAdminSession();
    if (!session) {
      return { success: false, error: "No hay una sesión administrativa activa." };
    }
    if (!roleId?.trim() || !condominiumId?.trim()) {
      return { success: false, error: "Identificador de rol o condominio inválido." };
    }

    const useCase = new DeactivateRoleUseCase(repository);
    const data = await useCase.execute(roleId, condominiumId, session.userId);
    revalidatePath("/listado-roles");
    revalidatePath(`/listado-roles/${roleId}`);
    revalidatePath("/directorio");
    return { success: true, data };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo completar la desactivación del rol.",
    };
  }
}
