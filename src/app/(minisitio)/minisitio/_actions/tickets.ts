"use server";

/** Solicitudes (tickets): alta y respuesta desde la pantalla Solicitudes y alta desde los estados de cuenta. */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { createTicket, replyToTicket, type CreateTicketInput } from "@/modules/minisitio/infrastructure/queries/tickets.queries";

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
