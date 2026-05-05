"use server";

import { updateDirectoryContactUseCase } from "@/modules/directory";
import type { DirectoryContactParticipation } from "@/modules/directory/domain/directory";

export async function saveDirectoryContactAction(id: string, data: Partial<DirectoryContactParticipation>) {
  try {
    await updateDirectoryContactUseCase.execute({ id, data });
    return { ok: true, message: "Contacto actualizado correctamente." };
  } catch (error) {
    console.error("[saveDirectoryContactAction] failed", error);
    return { ok: false, message: "No se pudo actualizar el contacto." };
  }
}
