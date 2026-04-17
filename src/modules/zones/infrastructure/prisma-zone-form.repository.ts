import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type { SaveZoneInput, ZoneCommandResult, ZoneFormSnapshot } from "../domain/zone-form";
import type { ZoneFormRepository } from "../domain/zone-form.repository";

function trimSafe(value: string): string {
  return value.trim();
}

function computeInitials(name: string): string {
  const fromWords = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

  if (fromWords.length > 0) {
    return fromWords;
  }

  return name.slice(0, 3).toUpperCase();
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

export class PrismaZoneFormRepository implements ZoneFormRepository {
  async getById(id: string): Promise<ZoneFormSnapshot | null> {
    const zoneId = trimSafe(id);
    if (!zoneId) {
      return null;
    }

    const condominiumId = await resolveCondominiumId();
    if (!condominiumId) {
      return null;
    }

    const zone = await prisma.zoneCatalog.findFirst({
      where: {
        id: zoneId,
        condominiumId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        initials: true,
      },
    });

    if (!zone) {
      return null;
    }

    return {
      id: zone.id,
      name: zone.name,
      initials: zone.initials,
    };
  }

  async save(input: SaveZoneInput): Promise<ZoneCommandResult> {
    const condominiumId = await resolveCondominiumId();
    if (!condominiumId) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const name = trimSafe(input.name);
    const initialsInput = trimSafe(input.initials ?? "");

    if (!name) {
      return {
        ok: false,
        message: "El nombre del barrio es obligatorio.",
      };
    }

    const initials = initialsInput || computeInitials(name);

    if (input.id) {
      const zoneId = trimSafe(input.id);

      const existing = await prisma.zoneCatalog.findFirst({
        where: {
          id: zoneId,
          condominiumId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!existing) {
        return {
          ok: false,
          message: "El barrio que intentas actualizar ya no existe.",
        };
      }

      const duplicated = await prisma.zoneCatalog.findFirst({
        where: {
          condominiumId,
          isActive: true,
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: {
            id: zoneId,
          },
        },
        select: { id: true },
      });

      if (duplicated) {
        return {
          ok: false,
          message: "Ya existe un barrio activo con ese nombre.",
        };
      }

      await prisma.zoneCatalog.update({
        where: { id: zoneId },
        data: {
          name,
          initials,
        },
      });

      return {
        ok: true,
        message: "Barrio actualizado correctamente.",
        zoneId,
      };
    }

    const duplicated = await prisma.zoneCatalog.findFirst({
      where: {
        condominiumId,
        isActive: true,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicated) {
      return {
        ok: false,
        message: "Ya existe un barrio activo con ese nombre.",
      };
    }

    const created = await prisma.zoneCatalog.create({
      data: {
        condominiumId,
        name,
        initials,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      message: "Barrio creado correctamente.",
      zoneId: created.id,
    };
  }
}
