import { PageSkeleton } from "@/components/minisitio/page-skeleton";

/** Carga de Experiencias: esqueleto del portal (aparece a los 400 ms). */
export default function ExperienciasLoading() {
  return <PageSkeleton label="Cargando experiencias…" />;
}
