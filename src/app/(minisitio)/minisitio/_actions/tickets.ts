"use server";

/** Solicitudes y reportes (tickets): pantalla Tickets y alta desde los estados de cuenta. */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  createTicket,
  listTicketDepartments,
  listTickets,
  replyToTicket,
  type CreateTicketInput,
  type TicketStatusFilter,
} from "@/modules/minisitio/infrastructure/queries/tickets.queries";

export async function listTicketsAction(status?: TicketStatusFilter) {
  const session = await requireCondominoSession();
  return listTickets(session, status);
}

export async function listTicketDepartmentsAction() {
  return listTicketDepartments();
}

export async function createTicketAction(input: CreateTicketInput) {
  const session = await requireCondominoSession();
  try {
    return await createTicket(session, input);
  } catch (error) {
    console.error("[minisitio] createTicketAction:", error);
    return { success: false as const, message: "Error al crear el ticket" };
  }
}

export async function replyTicketAction(ticketId: string, respuesta: string) {
  const session = await requireCondominoSession();
  try {
    return await replyToTicket(session, ticketId, respuesta);
  } catch (error) {
    console.error("[minisitio] replyTicketAction:", error);
    return { success: false as const, message: "Error al enviar la respuesta" };
  }
}
