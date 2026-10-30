import { PageSkeleton } from "@/components/minisitio/page-skeleton";

/** Carga del historial de avisos: esqueleto del portal (aparece a los 400 ms). */
export default function NotificacionesLoading() {
  return <PageSkeleton label="Cargando el historial de avisos…" />;
}
