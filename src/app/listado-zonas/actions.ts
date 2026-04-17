"use server";

import { revalidatePath } from "next/cache";

import { saveZoneUseCase } from "@/modules/zones";

export interface SaveZoneActionInput {
  id?: string;
  name: string;
  initials?: string;
}

export async function saveZoneAction(
  input: SaveZoneActionInput,
): Promise<{ ok: boolean; message: string; zoneId?: string }> {
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
