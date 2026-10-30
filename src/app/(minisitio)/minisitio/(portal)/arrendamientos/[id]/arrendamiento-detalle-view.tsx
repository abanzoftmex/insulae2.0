"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LegacyCard as Card } from "@/components/minisitio/legacy-card";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { ArrendamientoView } from "../arrendamientos-types";

/**
 * Comercio tal como lo lee la pantalla. `area_nombre`, `zona_nombre`, `monto_cargado` y
 * `monto_vencido` ya no vienen en el contrato (tampoco los mandaba el proxy del minisitio):
 * se muestran "N/A" / $0.00, igual que en el minisitio actual.
 */
type ArrendamientoDetalle = ArrendamientoView & {
  area_nombre?: string | null;
  zona_nombre?: string | null;
  monto_cargado?: number | null;
  monto_vencido?: number | null;
};

const ERROR_MESSAGE = "Error al cargar los detalles del arrendamiento";

/** Formato de fecha del legacy, con la zona de Val'Quirico para que servidor e hidratación coincidan. */
function formatFecha(value: string): string {
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
  } catch {
    return "N/A";
  }
}

/**
 * Detalle de un comercio (antes pages/arrendamientos/[id]/index.js). `arrendamiento` es null
 * si no es del condómino: el proxy legacy respondía 404 y la pantalla mostraba el error.
 */
export function ArrendamientoDetalleView({
  id,
  arrendamiento,
}: {
  id: string;
  arrendamiento: ArrendamientoDetalle | null;
}) {
  const router = useRouter();
  const { user, userType } = useMinisitioAuth();
  const setPageTitle = useMinisitioLayoutStore((s) => s.setPageTitle);
  const puedeVer = userType === "arrendatario" || userType === "both";

  useEffect(() => {
    if (!user || !id) return;

    if (userType !== "arrendatario" && userType !== "both") {
      router.push(msPath("/"));
      return;
    }

    // El legacy envolvía cada estado en <Layout title="…">, que fijaba el título del encabezado:
    // "Detalle de Comercio" (se quedaba tras cargar) o "Error".
    setPageTitle(arrendamiento ? "Detalle de Comercio" : "Error");
  }, [user, id, userType, router, arrendamiento, setPageTitle]);

  // El legacy dejaba el spinner mientras redirigía a quien no tiene comercios
  if (!puedeVer) {
    return <LoadingSpinner />;
  }

  if (!arrendamiento) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{ERROR_MESSAGE}</p>
          <Link href={msPath("/arrendamientos")} className="text-blue-600 hover:text-blue-800">
            Volver a Comercios
          </Link>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (statusId: number) => {
    const statusMap: Record<number, number> = {
      1: 1, // Activo -> Verde
      2: 3, // Inactivo -> Rojo
      3: 2, // Pendiente -> Amarillo
    };
    return statusMap[statusId] || 2;
  };

  return (
    <div className="space-y-6">
      {/* Navegación */}
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Link href={msPath("/arrendamientos")} className="hover:text-gray-700">
          Arrendamientos
        </Link>
        <span>/</span>
        <span className="text-gray-900">{arrendamiento.nombre_comercio || "Detalle"}</span>
      </div>

      {/* Información Principal */}
      <Card title="Información del Comercio">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Comercio</label>
              <p className="mt-1 text-sm text-gray-900">{arrendamiento.nombre_comercio || "N/A"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Razón Social</label>
              <p className="mt-1 text-sm text-gray-900">{arrendamiento.razon_social_comercio || "N/A"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Clase de Comercio</label>
              <p className="mt-1 text-sm text-gray-900">{arrendamiento.clase_comercio || "Sin clasificar"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <div className="mt-1">
                {/* Legacy: se pasaba el id de badge como `type` y un `text` que StatusBadge no acepta,
                    así que pinta una pastilla azul vacía. Se conserva tal cual (ver reporte del port). */}
                <StatusBadge type={String(getStatusBadge(arrendamiento.id_cat_status_comercios))} status={undefined} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Área Privativa</label>
              <p className="mt-1 text-sm text-gray-900">{arrendamiento.area_nombre || "N/A"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Zona</label>
              <p className="mt-1 text-sm text-gray-900">{arrendamiento.zona_nombre || "N/A"}</p>
            </div>

            {arrendamiento.fecha_inicio && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
                <p className="mt-1 text-sm text-gray-900">{formatFecha(arrendamiento.fecha_inicio)}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Información Financiera */}
      <Card title="Información Financiera">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Saldo Total</label>
              <p className="mt-1 text-lg font-semibold text-blue-600">
                $
                {arrendamiento.monto_cargado
                  ? arrendamiento.monto_cargado.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Monto Vencido</label>
              <p className="mt-1 text-lg font-semibold text-red-600">
                $
                {arrendamiento.monto_vencido
                  ? arrendamiento.monto_vencido.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Documentación */}
      {(arrendamiento.folio_861 || arrendamiento.fecha_inscripcion_f861 || arrendamiento.fecha_vigencia_f861) && (
        <Card title="Documentación F-861">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {arrendamiento.folio_861 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Folio F-861</label>
                <p className="mt-1 text-sm text-gray-900">{arrendamiento.folio_861}</p>
              </div>
            )}

            {arrendamiento.fecha_inscripcion_f861 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Inscripción</label>
                <p className="mt-1 text-sm text-gray-900">{formatFecha(arrendamiento.fecha_inscripcion_f861)}</p>
              </div>
            )}

            {arrendamiento.fecha_vigencia_f861 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Vigencia</label>
                <p className="mt-1 text-sm text-gray-900">{formatFecha(arrendamiento.fecha_vigencia_f861)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Acciones */}
      <Card title="Acciones">
        <div className="flex space-x-4">
          <Link
            href={msPath(`/arrendamientos/${id}/estado-cuenta`)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Ver Estado de Cuenta
          </Link>
          <Link
            href={msPath("/arrendamientos")}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Volver a Comercios
          </Link>
        </div>
      </Card>
    </div>
  );
}
