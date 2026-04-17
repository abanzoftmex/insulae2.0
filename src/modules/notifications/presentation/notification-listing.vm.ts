import type { NotificationListing } from "../domain/notification";

const TYPE_LABELS: Record<string, string> = {
  "1": "Propietarios",
  "2": "Comercios",
  "3": "Ambos",
};

function formatDate(value: Date | null): string {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export interface NotificationRowVM {
  id: string;
  title: string;
  messagePreview: string;
  sentAtLabel: string;
  validUntilLabel: string;
  typeLabel: string;
  categoryLabel: string;
  hasImageAttachment: boolean;
  hasPdfAttachment: boolean;
  pdfUrl: string | null;
}

export interface NotificationListingVM {
  title: string;
  subtitle: string;
  total: number;
  rows: NotificationRowVM[];
}

export function toNotificationListingVM(listing: NotificationListing): NotificationListingVM {
  return {
    title: "Notificaciones",
    subtitle: `Comunicacion operativa para ${listing.condominiumName}.`,
    total: listing.rows.length,
    rows: listing.rows.map((row) => ({
      id: row.id,
      title: row.title,
      messagePreview: row.message.length > 90 ? `${row.message.slice(0, 90)}...` : row.message,
      sentAtLabel: formatDate(row.sentAt),
      validUntilLabel: formatDate(row.validUntil),
      typeLabel: TYPE_LABELS[row.audienceTypeId ?? ""] ?? "Sin tipo",
      categoryLabel: row.categoryName ?? "Sin categoria",
      hasImageAttachment: Boolean(row.imageUrl),
      hasPdfAttachment: Boolean(row.pdfUrl),
      pdfUrl: row.pdfUrl,
    })),
  };
}
