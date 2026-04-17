"use server";

import { revalidatePath } from "next/cache";

import { saveCondominiumOrganigramUseCase } from "@/modules/condominium-organigram";
import type { SaveCondominiumOrganigramInput } from "@/modules/condominium-organigram/domain/condominium-organigram";

export async function saveCondominiumOrganigramAction(
  input: SaveCondominiumOrganigramInput,
): Promise<{ ok: boolean; message: string }> {
  const result = await saveCondominiumOrganigramUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/estructura-condominal");
  }

  return result;
}
