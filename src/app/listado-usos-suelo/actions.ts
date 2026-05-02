"use server";

import { revalidatePath } from "next/cache";

import { saveLandUseUseCase, getLandUseFormUseCase } from "@/modules/land-uses";
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
  return await getLandUseFormUseCase.execute(id);
}

export async function saveLandUseAction(
  input: SaveLandUseActionInput,
): Promise<{ ok: boolean; message: string; landUseId?: string }> {
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
