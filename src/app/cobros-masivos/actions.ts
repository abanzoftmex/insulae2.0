"use server";

import { revalidatePath } from "next/cache";
import { previewMassChargesUseCase, createMassChargesUseCase } from "@/modules/charge";
import {
  PreviewMassChargeRequest,
  PreviewMassChargeResult,
  CreateMassChargeRequest,
  PreviewPropertyResult,
} from "@/modules/charge/domain/mass-charge.types";

export async function previewMassChargesAction(
  req: PreviewMassChargeRequest
): Promise<{ success: boolean; data?: PreviewMassChargeResult; error?: string }> {
  try {
    const result = await previewMassChargesUseCase.execute(req);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMassChargesAction(
  req: CreateMassChargeRequest,
  previewCache: PreviewPropertyResult[]
): Promise<{ success: boolean; created?: number; error?: string }> {
  try {
    const result = await createMassChargesUseCase.execute(req, previewCache);
    if (result.success) {
      revalidatePath("/resumen-financiero");
      // Could revalidate other paths
    }
    return { success: true, created: result.chargesCreated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
