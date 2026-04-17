import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  NotificationCategoryOption,
  NotificationCommandResult,
  NotificationFormData,
  NotificationFormSnapshot,
  NotificationListing,
  NotificationTypeOption,
  SaveNotificationInput,
} from "../domain/notification";
import type { NotificationRepository } from "../domain/notification.repository";

const NOTIFICATION_TYPE_OPTIONS: NotificationTypeOption[] = [
  { id: "1", label: "Propietarios" },
  { id: "2", label: "Comercios" },
  { id: "3", label: "Ambos" },
];

const ALLOW_LEGACY_NOTIFICATION_ASSET_FALLBACK =
  process.env.ALLOW_LEGACY_NOTIFICATION_ASSET_FALLBACK?.trim().toLowerCase() === "true";

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = trimSafe(value);
  return normalized || null;
}

function isFirebaseAssetUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.host.toLowerCase();

    return (
      host.includes("firebasestorage.googleapis.com") ||
      host === "storage.googleapis.com" ||
      host.endsWith(".firebasestorage.app")
    );
  } catch {
    return false;
  }
}

function isLegacyNotificationAssetUrl(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("sistemasabanza.com/insulae") ||
    normalized.startsWith("imagenes/notificaciones/") ||
    normalized.startsWith("/imagenes/notificaciones/") ||
    normalized.startsWith("notificaciones/")
  );
}

function normalizeRuntimeAssetUrl(value: string | null | undefined): string | null {
  const normalized = trimSafe(value);
  if (!normalized) {
    return null;
  }

  if (isFirebaseAssetUrl(normalized)) {
    return normalized;
  }

  if (isLegacyNotificationAssetUrl(normalized) && !ALLOW_LEGACY_NOTIFICATION_ASSET_FALLBACK) {
    return null;
  }

  return normalized;
}

function toDateInputValue(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function parseDateInput(value: string | null | undefined): Date | null {
  const raw = trimSafe(value);
  if (!raw) {
    return null;
  }

  const iso = `${raw}T12:00:00.000Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveCondominium(): Promise<{ id: string; slug: string; name: string } | null> {
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

async function getCategoryOptions(condominiumId: string): Promise<NotificationCategoryOption[]> {
  const categories = await prisma.notificationCategory.findMany({
    where: {
      condominiumId,
      isActive: true,
    },
    select: {
      id: true,
      legacyId: true,
      name: true,
      color: true,
    },
    orderBy: [{ name: "asc" }],
  });

  return categories;
}

function normalizeTypeId(value: string | null | undefined): string {
  const raw = trimSafe(value);
  return NOTIFICATION_TYPE_OPTIONS.some((option) => option.id === raw) ? raw : "3";
}

function resolveSnapshotCategoryId(input: {
  categoryId: string | null;
  legacyCategoryValue: string | null;
  categoryOptions: NotificationCategoryOption[];
}): string {
  const explicitCategoryId = trimSafe(input.categoryId);
  if (explicitCategoryId) {
    return explicitCategoryId;
  }

  const rawLegacyValue = trimSafe(input.legacyCategoryValue);
  if (!rawLegacyValue || NOTIFICATION_TYPE_OPTIONS.some((option) => option.id === rawLegacyValue)) {
    return "";
  }

  const legacyNumericValue = Number.parseInt(rawLegacyValue, 10);
  const fallback =
    input.categoryOptions.find((option) => option.id === rawLegacyValue) ??
    input.categoryOptions.find((option) => option.name.trim().toLowerCase() === rawLegacyValue.toLowerCase()) ??
    (Number.isNaN(legacyNumericValue)
      ? null
      : input.categoryOptions.find((option) => option.legacyId === legacyNumericValue));

  return fallback?.id ?? "";
}

export class PrismaNotificationRepository implements NotificationRepository {
  async getListing(): Promise<NotificationListing | null> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return null;
    }

    const rows = (await (prisma as any).notification.findMany({
      where: {
        condominiumId: condominium.id,
      },
      select: {
        id: true,
        title: true,
        message: true,
        sentAt: true,
        validUntil: true,
        category: true,
        categoryId: true,
        imageUrl: true,
        pdfUrl: true,
        categoryRef: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ sentAt: "desc" }, { title: "asc" }],
    })) as Array<{
      id: string;
      title: string;
      message: string;
      sentAt: Date | null;
      validUntil: Date | null;
      category: string | null;
      categoryId: string | null;
      imageUrl: string | null;
      pdfUrl: string | null;
      categoryRef: { name: string } | null;
    }>;

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      rows: rows.map((row) => ({
        imageUrl: normalizeRuntimeAssetUrl(row.imageUrl),
        pdfUrl: normalizeRuntimeAssetUrl(row.pdfUrl),
        categoryName:
          row.categoryRef?.name ??
          (trimSafe(row.category) && !NOTIFICATION_TYPE_OPTIONS.some((option) => option.id === trimSafe(row.category))
            ? trimSafe(row.category)
            : null),
        id: row.id,
        title: row.title,
        message: row.message,
        sentAt: row.sentAt,
        validUntil: row.validUntil,
        audienceTypeId: row.category,
        categoryId: row.categoryId,
      })),
    };
  }

  async getFormData(notificationId?: string): Promise<NotificationFormData | null> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return null;
    }

    const categoryOptions = await getCategoryOptions(condominium.id);

    let snapshot: NotificationFormSnapshot | null = null;
    const id = trimSafe(notificationId);

    if (id) {
      const record = (await (prisma as any).notification.findFirst({
        where: {
          id,
          condominiumId: condominium.id,
        },
        select: {
          id: true,
          title: true,
          message: true,
          sentAt: true,
          validUntil: true,
          category: true,
          categoryId: true,
          imageUrl: true,
          imagePath: true,
          pdfUrl: true,
          pdfPath: true,
        },
      })) as {
        id: string;
        title: string;
        message: string;
        sentAt: Date | null;
        validUntil: Date | null;
        category: string | null;
        categoryId: string | null;
        imageUrl: string | null;
        imagePath: string | null;
        pdfUrl: string | null;
        pdfPath: string | null;
      } | null;

      if (!record) {
        return null;
      }

      snapshot = {
        id: record.id,
        title: record.title,
        message: record.message,
        sentAt: toDateInputValue(record.sentAt),
        validUntil: toDateInputValue(record.validUntil),
        audienceTypeId: normalizeTypeId(record.category),
        categoryId: resolveSnapshotCategoryId({
          categoryId: record.categoryId,
          legacyCategoryValue: record.category,
          categoryOptions,
        }),
        imageUrl: record.imageUrl ?? "",
        imagePath: record.imagePath ?? "",
        pdfUrl: record.pdfUrl ?? "",
        pdfPath: record.pdfPath ?? "",
      };
    }

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      typeOptions: NOTIFICATION_TYPE_OPTIONS,
      categoryOptions,
      snapshot,
    };
  }

  async save(input: SaveNotificationInput): Promise<NotificationCommandResult> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const title = trimSafe(input.title);
    if (title.length < 2) {
      return {
        ok: false,
        message: "El titulo debe tener al menos 2 caracteres.",
      };
    }

    const message = trimSafe(input.message);
    if (message.length < 2) {
      return {
        ok: false,
        message: "La descripcion debe tener al menos 2 caracteres.",
      };
    }

    const audienceTypeId = normalizeTypeId(input.audienceTypeId);
    const sentAt = parseDateInput(input.sentAt);
    const validUntil = parseDateInput(input.validUntil);

    if (sentAt && validUntil && validUntil.getTime() < sentAt.getTime()) {
      return {
        ok: false,
        message: "La vigencia no puede ser menor a la fecha de publicacion.",
      };
    }

    const imageUrl = normalizeOptionalText(input.imageUrl);
    const imagePath = normalizeOptionalText(input.imagePath);
    const pdfUrl = normalizeOptionalText(input.pdfUrl);
    const pdfPath = normalizeOptionalText(input.pdfPath);

    const categoryIdInput = trimSafe(input.categoryId);
    let categoryId: string | null = null;

    if (categoryIdInput) {
      const category = await prisma.notificationCategory.findFirst({
        where: {
          id: categoryIdInput,
          condominiumId: condominium.id,
          isActive: true,
        },
        select: { id: true },
      });

      if (!category) {
        return {
          ok: false,
          message: "La categoria seleccionada no es valida.",
        };
      }

      categoryId = category.id;
    }

    const notificationId = trimSafe(input.id);

    if (notificationId) {
      const existing = await (prisma as any).notification.findFirst({
        where: {
          id: notificationId,
          condominiumId: condominium.id,
        },
        select: { id: true },
      });

      if (!existing) {
        return {
          ok: false,
          message: "La notificacion ya no existe.",
        };
      }

      await (prisma as any).notification.update({
        where: { id: notificationId },
        data: {
          title,
          message,
          sentAt,
          validUntil,
          category: audienceTypeId,
          categoryId,
          imageUrl,
          imagePath,
          pdfUrl,
          pdfPath,
        },
      });

      return {
        ok: true,
        message: "Notificacion actualizada correctamente.",
        notificationId,
      };
    }

    const created = await (prisma as any).notification.create({
      data: {
        condominiumId: condominium.id,
        title,
        message,
        sentAt,
        validUntil,
        category: audienceTypeId,
        categoryId,
        imageUrl,
        imagePath,
        pdfUrl,
        pdfPath,
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      message: "Notificacion creada correctamente.",
      notificationId: created.id,
    };
  }

  async delete(notificationId: string): Promise<NotificationCommandResult> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const id = trimSafe(notificationId);
    if (!id) {
      return {
        ok: false,
        message: "La notificacion solicitada no es valida.",
      };
    }

    const existing = await (prisma as any).notification.findFirst({
      where: {
        id,
        condominiumId: condominium.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return {
        ok: false,
        message: "La notificacion ya no existe.",
      };
    }

    await (prisma as any).notification.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      ok: true,
      message: "Notificacion eliminada correctamente.",
      notificationId: existing.id,
    };
  }
}
