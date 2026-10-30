import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listTicketDepartments, listTickets } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { TicketsView } from "./tickets-view";

export const metadata: Metadata = { title: "Solicitudes" };

/**
 * Solicitudes y reportes (antes pages/tickets.js). Igual que la pantalla vieja al entrar:
 * todos los tickets (para los contadores de las pestañas), los de la pestaña inicial
 * ("abiertas") y los departamentos del formulario de alta. Cada carga falla por separado,
 * como antes: solo la lista de la pestaña muestra el aviso de error.
 *
 * `?nueva=1` abre el formulario de alta (lo usan Inicio y "Buscar o ir a…").
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const [session, params] = await Promise.all([requireCondominoSession(), searchParams]);

  const [all, open, departments] = await Promise.allSettled([
    listTickets(session),
    listTickets(session, "open"),
    listTicketDepartments(),
  ]);

  for (const result of [all, open, departments]) {
    if (result.status === "rejected") console.error("[minisitio] tickets:", result.reason);
  }

  return (
    <TicketsView
      initialAllTickets={all.status === "fulfilled" ? all.value.tickets : []}
      initialTickets={open.status === "fulfilled" ? open.value.tickets : []}
      departments={departments.status === "fulfilled" ? departments.value.departments : []}
      initialError={open.status === "rejected" ? "Error al cargar los tickets" : ""}
      initialCreateOpen={params.nueva === "1"}
    />
  );
}
