import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  NotificationCategoryCommandResult,
  NotificationCategoryFormSnapshot,
  NotificationCategoryListing,
  SaveNotificationCategoryInput,
} from "../domain/notification-category";
import type { NotificationCategoryRepository } from "../domain/notification-category.repository";

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeColor(value: string | null | undefined): string | null {
  const raw = trimSafe(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : null;
}

async function resolveCondominiumId(): Promise<{ id: string; slug: string; name: string } | null> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    }));

  if (!condominium) {
    return null;
  }

  return condominium;
}

export class PrismaNotificationCategoryRepository implements NotificationCategoryRepository {
  async getListing(): Promise<NotificationCategoryListing | null> {
    const condominium = await resolveCondominiumId();
    if (!condominium) {
      return null;
    }

    const rows = await prisma.notificationCategory.findMany({
      where: {
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            notifications: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        notificationsCount: row._count.notifications,
        canDelete: row._count.notifications === 0,
      })),
    };
  }

  async getById(id: string): Promise<NotificationCategoryFormSnapshot | null> {
    const condominium = await resolveCondominiumId();
    if (!condominium) {
      return null;
    }

    const categoryId = trimSafe(id);
    if (!categoryId) {
      return null;
    }

    const category = await prisma.notificationCategory.findFirst({
      where: {
        id: categoryId,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    if (!category) {
      return null;
    }

    return category;
  }

  async save(input: SaveNotificationCategoryInput): Promise<NotificationCategoryCommandResult> {
    const condominium = await resolveCondominiumId();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const name = trimSafe(input.name);
    if (name.length < 2) {
      return {
        ok: false,
        message: "El nombre debe tener al menos 2 caracteres.",
      };
    }

    const color = normalizeColor(input.color);
    const categoryId = trimSafe(input.id);

    if (categoryId) {
      const existing = await prisma.notificationCategory.findFirst({
        where: {
          id: categoryId,
          condominiumId: condominium.id,
          isActive: true,
        },
        select: { id: true },
      });

      if (!existing) {
        return {
          ok: false,
          message: "La categoria ya no existe.",
        };
      }

      const duplicate = await prisma.notificationCategory.findFirst({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          name: { equals: name, mode: "insensitive" },
          NOT: { id: categoryId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return {
          ok: false,
          message: "Ya existe una categoria activa con ese nombre.",
        };
      }

      await prisma.notificationCategory.update({
        where: { id: categoryId },
        data: {
          name,
          color,
        },
      });

      return {
        ok: true,
        message: "Categoria actualizada correctamente.",
        categoryId,
      };
    }

    const duplicate = await prisma.notificationCategory.findFirst({
      where: {
        condominiumId: condominium.id,
        isActive: true,
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        ok: false,
        message: "Ya existe una categoria activa con ese nombre.",
      };
    }

    const created = await prisma.notificationCategory.create({
      data: {
        condominiumId: condominium.id,
        name,
        color,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      message: "Categoria creada correctamente.",
      categoryId: created.id,
    };
  }

  async delete(id: string): Promise<NotificationCategoryCommandResult> {
    const condominium = await resolveCondominiumId();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const categoryId = trimSafe(id);
    if (!categoryId) {
      return {
        ok: false,
        message: "La categoria solicitada no es valida.",
      };
    }

    const category = await prisma.notificationCategory.findFirst({
      where: {
        id: categoryId,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        _count: {
          select: {
            notifications: true,
          },
        },
      },
    });

    if (!category) {
      return {
        ok: false,
        message: "La categoria ya no existe.",
      };
    }

    if (category._count.notifications > 0) {
      return {
        ok: false,
        message: "No se puede eliminar una categoria en uso.",
      };
    }

    await prisma.notificationCategory.update({
      where: { id: category.id },
      data: {
        isActive: false,
      },
    });

    return {
      ok: true,
      message: "Categoria eliminada correctamente.",
      categoryId: category.id,
    };
  }
}
