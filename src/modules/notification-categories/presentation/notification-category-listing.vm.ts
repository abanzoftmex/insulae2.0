import type { NotificationCategoryListing } from "../domain/notification-category";

export interface NotificationCategoryRowVM {
  id: string;
  name: string;
  color: string;
  notificationsCountLabel: string;
  canDelete: boolean;
}

export interface NotificationCategoryListingVM {
  title: string;
  subtitle: string;
  total: number;
  rows: NotificationCategoryRowVM[];
}

function normalizeColor(input: string | null): string {
  const value = (input ?? "").trim();
  if (!value) {
    return "#6D5C53";
  }

  // Supports both "#RRGGBB" and "RRGGBB" and falls back safely when invalid.
  const normalized = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : "#6D5C53";
}

export function toNotificationCategoryListingVM(
  listing: NotificationCategoryListing,
): NotificationCategoryListingVM {
  return {
    title: "Categorias de notificacion",
    subtitle: `Catalogo operativo de categorias para ${listing.condominiumName}.`,
    total: listing.rows.length,
    rows: listing.rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: normalizeColor(row.color),
      notificationsCountLabel: `${row.notificationsCount} ${row.notificationsCount === 1 ? "uso" : "usos"}`,
      canDelete: row.canDelete,
    })),
  };
}
