import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  listTicketDepartments,
  listTickets,
  type TicketDepartment,
} from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { TicketsView } from "./tickets-view";

export const metadata: Metadata = { title: "Solicitudes" };

/**
 * Solicitudes (`/minisitio/tickets`): todas las del condómino (la vista las separa en abiertas y
 * cerradas) y los departamentos del formulario. Tras crear o responder, la vista pide
 * router.refresh() y esta página vuelve a consultar.
 *
 * `?nueva=1` abre el formulario de alta (lo usan Inicio y "Buscar o ir a…").
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const [session, params] = await Promise.all([requireCondominoSession(), searchParams]);

  const [tickets, departments] = await Promise.all([
    listTickets(session)
      .then((r) => r.tickets)
      .catch((error) => {
        console.error("[minisitio] Solicitudes:", error);
        return null;
      }),
    // Sin departamentos el formulario sigue sirviendo (la solicitud va sin departamento).
    listTicketDepartments()
      .then((r) => r.departments)
      .catch((error): TicketDepartment[] => {
        console.error("[minisitio] Solicitudes: departamentos:", error);
        return [];
      }),
  ]);

  return <TicketsView tickets={tickets} departments={departments} initialCreateOpen={params.nueva === "1"} />;
}
