import { PageSkeleton } from "@/components/minisitio/page-skeleton";

/** Carga de Mis saldos: esqueleto del portal (aparece a los 400 ms). */
export default function DashboardLoading() {
  return <PageSkeleton label="Cargando tus saldos…" />;
}
