import { PageSkeleton } from "@/components/minisitio/page-skeleton";

/** Mientras el servidor resuelve la pantalla, el shell sigue visible y el contenido late. */
export default function PortalLoading() {
  return <PageSkeleton label="Cargando…" />;
}
