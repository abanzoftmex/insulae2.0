import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  listNotificaciones,
  type NotificacionesPage as NotificacionesData,
} from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { NotificacionesView } from "./notificaciones-view";

export const metadata: Metadata = { title: "Notificaciones" };

// Lo que quedaba en pantalla si la primera carga fallaba en el minisitio.
const EMPTY_PAGE: NotificacionesData = {
  notificaciones: [],
  pagination: { total: 0, limit: 10, offset: 0, hasMore: false, currentPage: 1, totalPages: 1 },
};

/** Notificaciones (`/minisitio/notificaciones`, antes pages/notificaciones.js): 10 por página. */
export default async function NotificacionesPage() {
  const session = await requireCondominoSession();

  const initialData = await listNotificaciones(session, { limit: 10, offset: 0 }).catch((error) => {
    console.error("[minisitio] Notificaciones:", error);
    return EMPTY_PAGE;
  });

  return <NotificacionesView initialData={initialData} />;
}
