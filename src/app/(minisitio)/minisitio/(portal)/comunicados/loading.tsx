import { PageSkeleton } from "@/components/minisitio/page-skeleton";

/** Carga de Avisos: esqueleto del portal (aparece a los 400 ms). */
export default function ComunicadosLoading() {
  return <PageSkeleton label="Cargando avisos…" />;
}
