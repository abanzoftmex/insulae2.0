import type { TicketListing, TicketResponseFormData, TicketStatusValue } from "../domain/ticket";

const STATUS_LABELS: Record<TicketStatusValue, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En proceso",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
};

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function toPreview(value: string): string {
  if (value.length <= 110) {
    return value;
  }

  return `${value.slice(0, 110)}...`;
}

export interface TicketRowVM {
  id: string;
  ticketNumber: string;
  departmentName: string;
  residentName: string;
  openedAtLabel: string;
  title: string;
  descriptionPreview: string;
  statusLabel: string;
  statusTone: "open" | "closed";
}

export interface TicketListingVM {
  title: string;
  subtitle: string;
  total: number;
  condominiumSlug: string;
  rows: TicketRowVM[];
}

export interface TicketResponseFormVM {
  condominiumName: string;
  statusOptions: Array<{ value: TicketStatusValue; label: string }>;
  snapshot: {
    id: string;
    ticketNumber: string;
    departmentName: string;
    residentName: string;
    residentPhone: string;
    residentEmail: string;
    openedAtLabel: string;
    title: string;
    description: string;
    response: string;
    status: TicketStatusValue;
    responseImageUrl: string;
    responseImagePath: string;
    responsePdfUrl: string;
    responsePdfPath: string;
  };
}

export function toTicketListingVM(listing: TicketListing): TicketListingVM {
  return {
    title: "Tickets",
    subtitle: `Seguimiento operativo para ${listing.condominiumName}.`,
    total: listing.rows.length,
    condominiumSlug: listing.condominiumSlug,
    rows: listing.rows.map((row) => ({
      id: row.id,
      ticketNumber: row.ticketNumber,
      departmentName: row.departmentName,
      residentName: row.residentName,
      openedAtLabel: formatDateTime(row.openedAt),
      title: row.title,
      descriptionPreview: toPreview(row.description || "Sin descripcion"),
      statusLabel: STATUS_LABELS[row.status],
      statusTone: row.status === "CLOSED" ? "closed" : "open",
    })),
  };
}

export function toTicketResponseFormVM(data: TicketResponseFormData): TicketResponseFormVM | null {
  if (!data.snapshot) {
    return null;
  }

  return {
    condominiumName: data.condominiumName,
    statusOptions: data.statusOptions,
    snapshot: {
      id: data.snapshot.id,
      ticketNumber: data.snapshot.ticketNumber,
      departmentName: data.snapshot.departmentName,
      residentName: data.snapshot.residentName,
      residentPhone: data.snapshot.residentPhone,
      residentEmail: data.snapshot.residentEmail,
      openedAtLabel: formatDateTime(data.snapshot.openedAt),
      title: data.snapshot.title,
      description: data.snapshot.description,
      response: data.snapshot.response,
      status: data.snapshot.status,
      responseImageUrl: data.snapshot.responseImageUrl,
      responseImagePath: data.snapshot.responseImagePath,
      responsePdfUrl: data.snapshot.responsePdfUrl,
      responsePdfPath: data.snapshot.responsePdfPath,
    },
  };
}
