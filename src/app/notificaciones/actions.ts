"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";

import { deleteNotificationUseCase, saveNotificationUseCase } from "@/modules/notifications";

export interface SaveNotificationActionInput {
  id?: string;
  title: string;
  message: string;
  sentAt?: string;
  validUntil?: string;
  audienceTypeId?: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  pdfUrl?: string | null;
  pdfPath?: string | null;
}

export async function saveNotificationAction(
  input: SaveNotificationActionInput,
): Promise<{ ok: boolean; message: string; notificationId?: string }> {
    await assertPermission(MODULES.NOTIFICACIONES, "canUpdate");
  const result = await saveNotificationUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/notificaciones");
  }

  return result;
}

export async function deleteNotificationAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string; notificationId?: string }> {
    await assertPermission(MODULES.NOTIFICACIONES, "canDelete");
  const notificationId = String(formData.get("notificationId") ?? "");
  const result = await deleteNotificationUseCase.execute(notificationId);

  if (result.ok) {
    revalidatePath("/notificaciones");
  }

  return result;
}
