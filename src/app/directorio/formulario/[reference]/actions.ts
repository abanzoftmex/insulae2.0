"use server";

import { updateDirectoryContactUseCase } from "@/modules/directory";
import type { DirectoryContactParticipation } from "@/modules/directory/domain/directory";
import { prisma } from "@/shared/infrastructure/db/prisma";
import crypto from "crypto";

export async function saveDirectoryContactAction(id: string, data: Partial<DirectoryContactParticipation>) {
  try {
    await updateDirectoryContactUseCase.execute({ id, data });
    return { ok: true, message: "Contacto actualizado correctamente." };
  } catch (error) {
    console.error("[saveDirectoryContactAction] failed", error);
    return { ok: false, message: "No se pudo actualizar el contacto." };
  }
}

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function updatePasswordAction(id: string, passwordPlain: string) {
  try {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashSHA256(passwordPlain) },
    });
    return { ok: true, message: "Contraseña actualizada correctamente." };
  } catch (error) {
    console.error("[updatePasswordAction] failed", error);
    return { ok: false, message: "No se pudo actualizar la contraseña." };
  }
}
