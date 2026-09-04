"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";

import { saveCondominiumOrganigramUseCase } from "@/modules/condominium-organigram";
import type { SaveCondominiumOrganigramInput } from "@/modules/condominium-organigram/domain/condominium-organigram";

import { 
  saveCondominiumStructureUseCase, 
  deleteCondominiumStructureGroupUseCase 
} from "@/modules/condominium-structure";
import type { SaveCondominiumStructureInput } from "@/modules/condominium-structure/domain/condominium-structure-form";

export async function saveCondominiumOrganigramAction(
  input: SaveCondominiumOrganigramInput,
): Promise<{ ok: boolean; message: string }> {
    await assertPermission(MODULES.ESTRUCTURA_CONDOMINAL, "canUpdate");
  const result = await saveCondominiumOrganigramUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/estructura-condominal");
  }

  return result;
}

export async function saveCondominiumStructureAction(
  input: SaveCondominiumStructureInput,
): Promise<{ ok: boolean; message: string; groupId?: string }> {
    await assertPermission(MODULES.ESTRUCTURA_CONDOMINAL, "canUpdate");
  const result = await saveCondominiumStructureUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/estructura-condominal");
  }

  return result;
}

export async function deleteCondominiumStructureGroupAction(
  groupId: string,
): Promise<{ ok: boolean; message: string }> {
    await assertPermission(MODULES.ESTRUCTURA_CONDOMINAL, "canDelete");
  const result = await deleteCondominiumStructureGroupUseCase.execute(groupId);

  if (result.ok) {
    revalidatePath("/estructura-condominal");
  }

  return result;
}
