import { LoadingSpinner } from "@/components/minisitio/loading-spinner";

/** Mismo estado de carga que tenía pages/comunicados.js mientras llegaban los datos. */
export default function ComunicadosLoading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando comunicados...</p>
      </div>
    </div>
  );
}
