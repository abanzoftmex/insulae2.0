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

const defaultTypes = [
  { code: "8-01", description: "Condómino" },
  { code: "8-02", description: "Conyuge" },
  { code: "8-03", description: "Hijos" },
  { code: "8-04", description: "Familiares" },
  { code: "8-05", description: "Personal a cargo" },
  { code: "8-06", description: "Visitas" },
  { code: "8-80", description: "Autorización para arrendar" },
  { code: "8-70", description: "Arrendatario" },
  { code: "8-71", description: "Conyuge" },
  { code: "8-72", description: "Hijos" },
  { code: "8-73", description: "Familiares" },
  { code: "8-74", description: "Personal a cargo" },
  { code: "8-75", description: "Visitas" },
  { code: "8-76", description: "Mascotas" },
  { code: "8-77", description: "Autos" },
  { code: "8-88", description: "Autorización para arrendar" },
  { code: "8-61", description: "Arrendatario" },
  { code: "8-11", description: "Empleados" },
  { code: "8-12", description: "Visitas" },
];

async function ensureRegistrationTypesExist(condominiumId: string) {
  const count = await prisma.registrationType.count({
    where: { condominiumId, isActive: true },
  });
  if (count === 0) {
    await prisma.registrationType.createMany({
      data: defaultTypes.map((t) => ({
        condominiumId,
        code: t.code,
        description: t.description,
      })),
    });
  }
}

export async function getRegistrationTypesAction(condominiumId: string) {
  try {
    await ensureRegistrationTypesExist(condominiumId);
    const items = await prisma.registrationType.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { code: "asc" },
    });
    return { ok: true, data: items };
  } catch (error) {
    console.error("[getRegistrationTypesAction] failed", error);
    return { ok: false, data: [] };
  }
}

export async function addRegistrationTypeAction(condominiumId: string, description: string) {
  try {
    await ensureRegistrationTypesExist(condominiumId);
    const existing = await prisma.registrationType.findMany({
      where: { condominiumId, isActive: true },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((e) => e.code));

    let index = 1;
    let nextCode = "";
    while (true) {
      nextCode = `8-${String(index).padStart(2, "0")}`;
      if (!existingCodes.has(nextCode)) {
        break;
      }
      index++;
    }

    const newItem = await prisma.registrationType.create({
      data: {
        condominiumId,
        code: nextCode,
        description,
      },
    });

    return { ok: true, data: newItem };
  } catch (error) {
    console.error("[addRegistrationTypeAction] failed", error);
    return { ok: false, message: "No se pudo agregar la descripción." };
  }
}

export async function updateRegistrationTypeAction(id: string, description: string) {
  try {
    await prisma.registrationType.update({
      where: { id },
      data: { description },
    });
    return { ok: true };
  } catch (error) {
    console.error("[updateRegistrationTypeAction] failed", error);
    return { ok: false, message: "No se pudo actualizar la descripción." };
  }
}

export async function deleteRegistrationTypeAction(id: string) {
  try {
    await prisma.registrationType.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  } catch (error) {
    console.error("[deleteRegistrationTypeAction] failed", error);
    return { ok: false, message: "No se pudo eliminar la descripción." };
  }
}

