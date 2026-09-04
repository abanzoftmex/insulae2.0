"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";

import { saveLandUseUseCase, getLandUseFormUseCase, deleteLandUseUseCase } from "@/modules/land-uses";
import type { SaveLandUseChargeInput } from "@/modules/land-uses/domain/land-use-form";

export interface SaveLandUseActionInput {
  id?: string;
  name: string;
  initials?: string;
  order?: number | null;
  weight?: number | null;
  percentage?: number | null;
  charges: SaveLandUseChargeInput[];
}

export async function getLandUseFormDataAction(id: string) {
    await assertPermission(MODULES.USOS_DE_SUELO, "canRead");
  return await getLandUseFormUseCase.execute(id);
}

export async function saveLandUseAction(
  input: SaveLandUseActionInput,
): Promise<{ ok: boolean; message: string; landUseId?: string }> {
    await assertPermission(MODULES.USOS_DE_SUELO, "canUpdate");
  const response = await saveLandUseUseCase.execute({
    id: input.id,
    name: input.name,
    initials: input.initials,
    order: input.order,
    weight: input.weight,
    percentage: input.percentage,
    charges: input.charges,
  });

  if (response.ok) {
    revalidatePath("/listado-usos-suelo");
  }

  return response;
}

export async function deleteLandUseAction(id: string): Promise<{ ok: boolean; message: string }> {
    await assertPermission(MODULES.USOS_DE_SUELO, "canDelete");
  const response = await deleteLandUseUseCase.execute(id);

  if (response.ok) {
    revalidatePath("/listado-usos-suelo");
  }

  return response;
}
