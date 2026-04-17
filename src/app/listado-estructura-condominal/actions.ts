"use server";

import { revalidatePath } from "next/cache";

import {
  deleteCondominiumStructureGroupUseCase,
  saveCondominiumStructureUseCase,
} from "@/modules/condominium-structure";
import type {
  CondominiumStructureType,
} from "@/modules/condominium-structure/domain/condominium-structure-listing";
import type { SaveCondominiumStructureConceptInput } from "@/modules/condominium-structure/domain/condominium-structure-form";

export interface SaveCondominiumStructureActionInput {
  id?: string;
  name: string;
  position?: number | null;
  structureType?: CondominiumStructureType;
  concepts: SaveCondominiumStructureConceptInput[];
}

export async function saveCondominiumStructureAction(
  input: SaveCondominiumStructureActionInput,
): Promise<{ ok: boolean; message: string; groupId?: string }> {
  const response = await saveCondominiumStructureUseCase.execute({
    id: input.id,
    name: input.name,
    position: input.position,
    structureType: input.structureType,
    concepts: input.concepts,
  });

  if (response.ok) {
    revalidatePath("/listado-estructura-condominal");
  }

  return response;
}

export async function deleteCondominiumStructureGroupAction(
  groupId: string,
): Promise<{ ok: boolean; message: string }> {
  const response = await deleteCondominiumStructureGroupUseCase.execute(groupId);

  if (response.ok) {
    revalidatePath("/listado-estructura-condominal");
  }

  return {
    ok: response.ok,
    message: response.message,
  };
}

export async function deleteCondominiumStructureGroupFromFormAction(
  formData: FormData,
): Promise<void> {
  const groupId = String(formData.get("groupId") ?? "");
  await deleteCondominiumStructureGroupAction(groupId);
}
