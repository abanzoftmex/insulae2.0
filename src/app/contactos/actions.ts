"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

const DEFAULT_CONTACT_TYPES = [
  "Email",
  "Telefono",
  "WhatsApp",
  "Sitio web",
  "Red social",
] as const;

export interface ContactEntryInput {
  id?: string;
  typeId: string;
  name: string;
  value: string;
  linkUrl: string;
  target: "SAME_TAB" | "NEW_TAB";
  sortOrder: string;
}

function trimSafe(value: string): string {
  return value.trim();
}

function parseSortOrder(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ensureDefaultContactTypes(): Promise<void> {
  const activeTypeRows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT "name"
    FROM "ContactType"
    WHERE "isActive" = true
  `;

  const existingNames = new Set(activeTypeRows.map((row) => row.name.trim().toLowerCase()));

  for (const typeName of DEFAULT_CONTACT_TYPES) {
    if (existingNames.has(typeName.toLowerCase())) {
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "ContactType" (
        "id",
        "name",
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${typeName},
        true,
        now(),
        now()
      )
    `;
  }
}

async function resolveCondominiumId(): Promise<string | null> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: { id: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }));

  return condominium?.id ?? null;
}

export async function createContactAction(
  input: ContactEntryInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    await ensureDefaultContactTypes();

    const condominiumId = await resolveCondominiumId();
    if (!condominiumId) {
      return { ok: false, message: "No se encontro condominio activo." };
    }

    const typeId = trimSafe(input.typeId);
    const name = trimSafe(input.name);
    const value = trimSafe(input.value);
    const linkUrl = trimSafe(input.linkUrl);

    if (!typeId || !name || !value || !linkUrl) {
      return { ok: false, message: "Todos los campos son obligatorios." };
    }

    const typeRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ContactType"
      WHERE "id" = ${typeId}
        AND "isActive" = true
      LIMIT 1
    `;

    if (typeRows.length === 0) {
      return { ok: false, message: "El tipo de contacto no es valido." };
    }

    await prisma.$executeRaw`
      INSERT INTO "ContactEntry" (
        "id",
        "condominiumId",
        "contactTypeId",
        "name",
        "value",
        "linkUrl",
        "linkTarget",
        "sortOrder",
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${condominiumId},
        ${typeId},
        ${name},
        ${value},
        ${linkUrl},
        ${input.target}::"ContactLinkTarget",
        ${parseSortOrder(input.sortOrder)},
        true,
        now(),
        now()
      )
    `;

    revalidatePath("/contactos");
    return { ok: true, message: "Contacto agregado correctamente." };
  } catch (error) {
    console.error("[Contactos] createContactAction failed", error);
    return { ok: false, message: "No se pudo crear el contacto." };
  }
}

export async function updateContactAction(
  input: ContactEntryInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (!input.id) {
      return { ok: false, message: "No se recibio el identificador del contacto." };
    }

    const condominiumId = await resolveCondominiumId();
    if (!condominiumId) {
      return { ok: false, message: "No se encontro condominio activo." };
    }

    const typeId = trimSafe(input.typeId);
    const name = trimSafe(input.name);
    const value = trimSafe(input.value);
    const linkUrl = trimSafe(input.linkUrl);

    if (!typeId || !name || !value || !linkUrl) {
      return { ok: false, message: "Todos los campos son obligatorios." };
    }

    const typeRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ContactType"
      WHERE "id" = ${typeId}
        AND "isActive" = true
      LIMIT 1
    `;

    if (typeRows.length === 0) {
      return { ok: false, message: "El tipo de contacto no es valido." };
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ContactEntry"
      WHERE "id" = ${input.id}
        AND "condominiumId" = ${condominiumId}
        AND "isActive" = true
      LIMIT 1
    `;

    if (existing.length === 0) {
      return { ok: false, message: "El contacto no existe o ya no esta activo." };
    }

    await prisma.$executeRaw`
      UPDATE "ContactEntry"
      SET
        "contactTypeId" = ${typeId},
        "name" = ${name},
        "value" = ${value},
        "linkUrl" = ${linkUrl},
        "linkTarget" = ${input.target}::"ContactLinkTarget",
        "sortOrder" = ${parseSortOrder(input.sortOrder)},
        "updatedAt" = now()
      WHERE "id" = ${existing[0].id}
    `;

    revalidatePath("/contactos");
    return { ok: true, message: "Contacto actualizado." };
  } catch (error) {
    console.error("[Contactos] updateContactAction failed", error);
    return { ok: false, message: "No se pudo actualizar el contacto." };
  }
}

export async function deleteContactAction(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const contactId = trimSafe(id);
    if (!contactId) {
      return { ok: false, message: "No se recibio el identificador del contacto." };
    }

    const condominiumId = await resolveCondominiumId();
    if (!condominiumId) {
      return { ok: false, message: "No se encontro condominio activo." };
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "ContactEntry"
      WHERE "id" = ${contactId}
        AND "condominiumId" = ${condominiumId}
        AND "isActive" = true
      LIMIT 1
    `;

    if (existing.length === 0) {
      return { ok: false, message: "El contacto no existe o ya esta eliminado." };
    }

    await prisma.$executeRaw`
      UPDATE "ContactEntry"
      SET
        "isActive" = false,
        "updatedAt" = now()
      WHERE "id" = ${existing[0].id}
    `;

    revalidatePath("/contactos");
    return { ok: true, message: "Contacto eliminado." };
  } catch (error) {
    console.error("[Contactos] deleteContactAction failed", error);
    return { ok: false, message: "No se pudo eliminar el contacto." };
  }
}
