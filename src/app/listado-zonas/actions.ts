"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";

import { saveZoneUseCase, getZoneFormUseCase, deleteZoneUseCase } from "@/modules/zones";

export interface SaveZoneActionInput {
  id?: string;
  name: string;
  initials?: string;
}

export async function getZoneFormDataAction(id: string) {
    await assertPermission(MODULES.BARRIOS, "canRead");
  return await getZoneFormUseCase.execute(id);
}

export async function saveZoneAction(
  input: SaveZoneActionInput,
): Promise<{ ok: boolean; message: string; zoneId?: string }> {
    await assertPermission(MODULES.BARRIOS, "canUpdate");
  const response = await saveZoneUseCase.execute({
    id: input.id,
    name: input.name,
    initials: input.initials,
  });

  if (response.ok) {
    revalidatePath("/listado-zonas");
  }

  return response;
}

export async function deleteZoneAction(id: string): Promise<{ ok: boolean; message: string }> {
    await assertPermission(MODULES.BARRIOS, "canDelete");
  const result = await deleteZoneUseCase.execute(id);

  if (result.ok) {
    revalidatePath("/listado-zonas");
  }

  return result;
}
