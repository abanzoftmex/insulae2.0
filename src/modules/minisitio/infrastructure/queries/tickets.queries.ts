/**
 * Solicitudes y reportes (tickets) del condómino.
 *
 * El modelo Ticket no tiene campo para la respuesta del condómino: se anexa a `description`
 * con un marcador, igual que hacía la API anterior (el panel admin lo lee del mismo modo).
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { getMinisitioCondominium, toIso } from "../condominium";

const REPLY_MARK = "\n\n---RESPUESTA_CONDOMINO---\n";

function statusToLegacy(status: string): { id: number; texto: string } {
  return status === "RESOLVED" || status === "CLOSED" ? { id: 2, texto: "Cerrado" } : { id: 1, texto: "Abierto" };
}

export type TicketStatusFilter = "open" | "closed" | null | undefined;

export async function listTickets(session: CondominoTokenPayload, status?: TicketStatusFilter) {
  const tickets = await prisma.ticket.findMany({
    where: {
      condominiumId: session.condominiumId,
      openedById: session.userId,
      ...(status === "open" ? { status: { in: ["OPEN", "IN_PROGRESS"] } } : {}),
      ...(status === "closed" ? { status: { in: ["RESOLVED", "CLOSED"] } } : {}),
    },
    orderBy: { openedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      openedAt: true,
      status: true,
      openedById: true,
      response: true,
      respondedAt: true,
      responsePdfUrl: true,
      responseImageUrl: true,
      department: { select: { id: true, name: true, email: true } },
    },
  });

  const out = tickets.map((t) => {
    const st = statusToLegacy(t.status);
    let descripcion = t.description || "";
    let respuestaUsuario: string | null = null;
    let fechaRespuestaUsuario: string | null = null;
    const idx = descripcion.indexOf(REPLY_MARK);
    if (idx >= 0) {
      const replyBlock = descripcion.slice(idx + REPLY_MARK.length);
      descripcion = descripcion.slice(0, idx);
      const m = replyBlock.match(/^\[(.+?)\]\s*([\s\S]*)$/);
      if (m) {
        fechaRespuestaUsuario = m[1];
        respuestaUsuario = m[2].trim();
      } else {
        respuestaUsuario = replyBlock.trim();
      }
    }
    return {
      id_tickets: t.id,
      nombre: t.title,
      descripcion,
      fecha: toIso(t.openedAt),
      id_cat_status_tickets: st.id,
      id_directorio: t.openedById,
      respuesta: t.response || null,
      fecha_respuesta: toIso(t.respondedAt),
      pdf_respuesta: t.responsePdfUrl || null,
      imagen_respuesta: t.responseImageUrl || null,
      respuesta_usuario: respuestaUsuario,
      fecha_respuesta_usuario: fechaRespuestaUsuario,
      id_tickets_departamentos: t.department?.id ?? null,
      departamento: t.department?.name ?? null,
      departamento_email: t.department?.email ?? null,
      status_texto: st.texto,
    };
  });

  return { success: true as const, tickets: out };
}

export type Ticket = Awaited<ReturnType<typeof listTickets>>["tickets"][number];

/** Departamentos de soporte del condominio (formulario de alta de ticket). */
export async function listTicketDepartments() {
  const condominium = await getMinisitioCondominium();
  if (!condominium) return { success: true as const, departments: [] as TicketDepartment[] };

  const departments = await prisma.ticketDepartment.findMany({
    where: { condominiumId: condominium.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  return {
    success: true as const,
    departments: departments.map((d) => ({ id: d.id, nombre: d.name, email: d.email })),
  };
}

export interface TicketDepartment {
  id: string;
  nombre: string;
  email: string;
}

export interface CreateTicketInput {
  id_tickets_departamentos?: string | null;
  nombre?: string;
  descripcion?: string;
}

export async function createTicket(session: CondominoTokenPayload, input: CreateTicketInput) {
  const nombre = (input?.nombre || "").trim();
  const descripcion = (input?.descripcion || "").trim();
  const departamentoId = input?.id_tickets_departamentos || null;
  if (!nombre || !descripcion) {
    return { success: false as const, message: "Todos los campos son obligatorios" };
  }

  // El departamento (si viene) debe pertenecer al condominio.
  const department = departamentoId
    ? await prisma.ticketDepartment.findFirst({
        where: { id: String(departamentoId), condominiumId: session.condominiumId, isActive: true },
        select: { id: true, name: true, email: true },
      })
    : null;

  const ticket = await prisma.ticket.create({
    data: {
      condominiumId: session.condominiumId,
      openedById: session.userId,
      departmentId: department?.id ?? null,
      title: nombre,
      description: descripcion,
      status: "OPEN",
    },
    select: { id: true, title: true, description: true, openedAt: true },
  });

  return {
    success: true as const,
    message: "Ticket creado exitosamente",
    ticket: {
      id: ticket.id,
      nombre: ticket.title,
      descripcion: ticket.description,
      fecha: toIso(ticket.openedAt),
      departamento: department?.name ?? null,
      departamento_email: department?.email ?? null,
      status: "Abierto",
    },
  };
}

/** El condómino responde a su propio ticket (reemplaza su respuesta previa, si la había). */
export async function replyToTicket(session: CondominoTokenPayload, ticketId: string, respuestaInput: string) {
  const respuesta = (respuestaInput || "").trim();
  if (!respuesta) return { success: false as const, message: "La respuesta no puede estar vacía" };

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, condominiumId: session.condominiumId, openedById: session.userId },
    select: { id: true, description: true },
  });
  if (!ticket) return { success: false as const, message: "No tienes permiso para responder a este ticket" };

  const base = (ticket.description || "").split(REPLY_MARK)[0];
  const stamp = new Date().toISOString();
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { description: `${base}${REPLY_MARK}[${stamp}]\n${respuesta}` },
  });

  return { success: true as const, message: "Respuesta enviada exitosamente", ticketId: ticket.id };
}
