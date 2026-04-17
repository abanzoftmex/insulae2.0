"use server";

import { revalidatePath } from "next/cache";

import {
  deleteNotificationCategoryUseCase,
  saveNotificationCategoryUseCase,
} from "@/modules/notification-categories";

export interface SaveNotificationCategoryActionInput {
  id?: string;
  name: string;
  color?: string | null;
}

export async function saveNotificationCategoryAction(
  input: SaveNotificationCategoryActionInput,
): Promise<{ ok: boolean; message: string; categoryId?: string }> {
  const result = await saveNotificationCategoryUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/categorias-notificacion");
  }

  return result;
}

export async function deleteNotificationCategoryAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string; categoryId?: string }> {
  const id = String(formData.get("categoryId") ?? "");
  const result = await deleteNotificationCategoryUseCase.execute(id);

  if (result.ok) {
    revalidatePath("/categorias-notificacion");
  }

  return result;
}
