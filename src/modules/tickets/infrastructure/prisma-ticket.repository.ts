import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  SaveTicketResponseInput,
  TicketCommandResult,
  TicketListing,
  TicketResponseFormData,
  TicketStatusOption,
  TicketStatusValue,
} from "../domain/ticket";
import type { TicketRepository } from "../domain/ticket.repository";

const STATUS_OPTIONS: TicketStatusOption[] = [
  { value: "OPEN", label: "Abierto" },
  { value: "IN_PROGRESS", label: "En proceso" },
  { value: "RESOLVED", label: "Resuelto" },
  { value: "CLOSED", label: "Cerrado" },
];

type TicketRow = {
  id: string;
  legacyId: number | null;
  title: string;
  description: string | null;
  openedAt: Date | null;
  status: TicketStatusValue;
  department: { name: string } | null;
  openedBy: {
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
  } | null;
};

type TicketFormRow = {
  id: string;
  legacyId: number | null;
  title: string;
  description: string | null;
  response: string | null;
  status: TicketStatusValue;
  openedAt: Date | null;
  responseImageUrl: string | null;
  responseImagePath: string | null;
  responsePdfUrl: string | null;
  responsePdfPath: string | null;
  department: { name: string } | null;
  openedBy: {
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

type TicketDelegate = {
  findMany(args: unknown): Promise<TicketRow[]>;
  findFirst(args: unknown): Promise<TicketFormRow | { id: string } | null>;
  update(args: unknown): Promise<{ id: string }>;
};

const ticketModel = (
  prisma as unknown as {
    ticket: TicketDelegate;
  }
).ticket;

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = trimSafe(value);
  return normalized || null;
}

function toTicketStatus(value: unknown): TicketStatusValue {
  return STATUS_OPTIONS.some((option) => option.value === value) ? (value as TicketStatusValue) : "OPEN";
}

function formatUserName(input: {
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
} | null): string {
  if (!input) {
    return "Sin condomino";
  }

  const businessName = trimSafe(input.businessName);
  if (businessName) {
    return businessName;
  }

  const fullName = [trimSafe(input.firstName), trimSafe(input.lastName)].filter(Boolean).join(" ");
  return fullName || "Sin condomino";
}

function resolveTicketNumber(legacyId: number | null): string {
  return legacyId === null ? "S/N" : String(legacyId);
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

  return condominium ?? null;
}

export class PrismaTicketRepository implements TicketRepository {
  async getListing(): Promise<TicketListing | null> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return null;
    }

    const rows = await ticketModel.findMany({
      where: {
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        legacyId: true,
        title: true,
        description: true,
        openedAt: true,
        status: true,
        department: {
          select: {
            name: true,
          },
        },
        openedBy: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
      },
      orderBy: [{ openedAt: "desc" }, { legacyId: "desc" }],
    });

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      rows: rows.map((row: TicketRow) => ({
        id: row.id,
        ticketNumber: resolveTicketNumber(row.legacyId),
        departmentName: row.department?.name ?? "Sin departamento",
        residentName: formatUserName(row.openedBy),
        openedAt: row.openedAt,
        title: row.title,
        description: row.description ?? "",
        status: toTicketStatus(row.status),
      })),
    };
  }

  async getResponseFormData(ticketId: string): Promise<TicketResponseFormData | null> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return null;
    }

    const id = trimSafe(ticketId);
    if (!id) {
      return null;
    }

    const ticket = (await ticketModel.findFirst({
      where: {
        id,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
        legacyId: true,
        title: true,
        description: true,
        response: true,
        status: true,
        openedAt: true,
        responseImageUrl: true,
        responseImagePath: true,
        responsePdfUrl: true,
        responsePdfPath: true,
        department: {
          select: {
            name: true,
          },
        },
        openedBy: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
            phone: true,
            email: true,
          },
        },
      },
    })) as TicketFormRow | null;

    if (!ticket) {
      return null;
    }

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      statusOptions: STATUS_OPTIONS,
      snapshot: {
        id: ticket.id,
        ticketNumber: resolveTicketNumber(ticket.legacyId),
        departmentName: ticket.department?.name ?? "Sin departamento",
        residentName: formatUserName(ticket.openedBy),
        residentPhone: trimSafe(ticket.openedBy?.phone),
        residentEmail: trimSafe(ticket.openedBy?.email),
        openedAt: ticket.openedAt,
        title: ticket.title,
        description: ticket.description ?? "",
        response: ticket.response ?? "",
        status: toTicketStatus(ticket.status),
        responseImageUrl: ticket.responseImageUrl ?? "",
        responseImagePath: ticket.responseImagePath ?? "",
        responsePdfUrl: ticket.responsePdfUrl ?? "",
        responsePdfPath: ticket.responsePdfPath ?? "",
      },
    };
  }

  async saveResponse(input: SaveTicketResponseInput): Promise<TicketCommandResult> {
    const condominium = await resolveCondominium();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const id = trimSafe(input.id);
    if (!id) {
      return {
        ok: false,
        message: "El ticket solicitado no es valido.",
      };
    }

    const response = trimSafe(input.response);
    if (response.length < 2) {
      return {
        ok: false,
        message: "La respuesta debe tener al menos 2 caracteres.",
      };
    }

    const status = toTicketStatus(input.status);

    const existing = (await ticketModel.findFirst({
      where: {
        id,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    })) as { id: string } | null;

    if (!existing) {
      return {
        ok: false,
        message: "El ticket ya no existe.",
      };
    }

    const now = new Date();

    await ticketModel.update({
      where: {
        id: existing.id,
      },
      data: {
        response,
        status,
        respondedAt: now,
        closedAt: status === "CLOSED" ? now : null,
        responseImageUrl: normalizeOptionalText(input.responseImageUrl),
        responseImagePath: normalizeOptionalText(input.responseImagePath),
        responsePdfUrl: normalizeOptionalText(input.responsePdfUrl),
        responsePdfPath: normalizeOptionalText(input.responsePdfPath),
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      message: "Respuesta de ticket actualizada correctamente.",
      ticketId: existing.id,
    };
  }
}
