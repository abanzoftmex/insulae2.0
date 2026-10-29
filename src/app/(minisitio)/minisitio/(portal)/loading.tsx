import { LoadingSpinner } from "@/components/minisitio/loading-spinner";

/** Mientras el servidor resuelve los datos de la pantalla, el shell sigue visible. */
export default function PortalLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="large" text="Cargando..." />
    </div>
  );
}
