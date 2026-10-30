"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import type { PropertyDetail } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { ImageGallery } from "./image-gallery";

/**
 * Balance tal como lo lee la pantalla. `ultimo_pago`, `fecha_ultimo_pago` y `total_cargos` ya
 * no vienen en el contrato (tampoco los mandaba el proxy del minisitio): se muestran en $0.00 /
 * "Sin registros" / "Sin cargos", igual que en el minisitio actual.
 */
type BalanceView = PropertyDetail["balance"] & {
  ultimo_pago?: number | null;
  fecha_ultimo_pago?: string | null;
  total_cargos?: number | null;
};

/** Detalle de una propiedad (antes pages/propiedades/[id].js). `detail` es null si no es del condómino. */
export function PropiedadDetalleView({ id, detail }: { id: string; detail: PropertyDetail | null }) {
  const router = useRouter();
  const { user, isAuthenticated, userType } = useMinisitioAuth();
  const setPageData = useMinisitioLayoutStore((s) => s.setPageData);
  const propiedad = detail?.propiedad ?? null;
  const balance: BalanceView | null = detail?.balance ?? null;
  const images = detail?.images ?? [];
  const puedeVer = userType === "propietario" || userType === "both";

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(msPath("/login"));
      return;
    }

    if (userType !== "propietario" && userType !== "both") {
      router.push(msPath("/dashboard"));
      return;
    }

    if (propiedad) {
      // Set page data when propiedad is loaded
      setPageData({
        title: `Propiedad: ${propiedad.nombre}`,
        breadcrumbs: [{ label: "Propiedades", href: msPath("/propiedades") }, { label: propiedad.nombre }],
      });
    }
  }, [propiedad, isAuthenticated, userType, router, setPageData]);

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatM2 = (m2: number | null | undefined) => {
    return `${(m2 || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })} m²`;
  };

  // El legacy dejaba el spinner mientras redirigía a quien no es propietario
  if (!puedeVer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!propiedad) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Propiedad no encontrada</h3>
          <p className="text-gray-600 mb-4">La propiedad que buscas no existe o no tienes permisos para verla.</p>
          <Link
            href={msPath("/propiedades")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Volver a Propiedades
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Información clave de la propiedad */}
      <div className="bg-white border border-gray-200 rounded-md p-4">
        {/* Métricas de superficie */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">M² Totales</div>
            <div className="font-mono font-semibold text-lg">{formatM2(propiedad.m2_totales)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">M² Construcción</div>
            <div className="font-mono font-semibold text-lg">{formatM2(propiedad.m2_construccion)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">M² Área Común</div>
            <div className="font-mono font-semibold text-lg">{formatM2(propiedad.m2_area_comun)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">% Indiviso</div>
            <div className="font-mono font-semibold text-lg">{(propiedad.indiviso || 0.0417).toFixed(4)}%</div>
          </div>
        </div>

        {/* Información del propietario y ubicación */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">Propietario</div>
              <div className="text-sm font-medium text-gray-900">
                {user?.nombre} {user?.apaterno} {user?.amaterno}
              </div>
              <div className="text-xs text-gray-600">{user?.email}</div>
            </div>
            <div className="border-l border-gray-200 pl-6">
              <div className="text-xs text-gray-500 mb-1">Contacto</div>
              <div className="text-sm text-gray-900">{user?.telefono || "No disponible"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Barrio</div>
              <div className="text-sm font-medium">{propiedad.zona || "No especificado"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Uso de Suelo</div>
              <div className="text-sm font-medium">{propiedad.uso_suelo || "No especificado"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen financiero simplificado */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Resumen de Cuenta</h2>
          <Link
            href={msPath(`/propiedades/${id}/estado-cuenta`)}
            className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors inline-flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Estado de Cuenta
          </Link>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Saldo actual */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-2">SALDO ACTUAL</div>
              <div
                className={`text-2xl font-bold font-mono ${
                  (balance?.saldo_pendiente ?? 0) > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {formatCurrency(balance?.saldo_pendiente || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(balance?.saldo_pendiente ?? 0) > 0 ? "Pendiente de pago" : "Al corriente"}
              </div>
            </div>

            {/* Último pago */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-2">ÚLTIMO PAGO</div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatCurrency(balance?.ultimo_pago || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {balance?.fecha_ultimo_pago
                  ? (() => {
                      try {
                        const d = new Date(balance.fecha_ultimo_pago);
                        return isNaN(d.getTime())
                          ? "Sin registros"
                          : d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
                      } catch {
                        return "Sin registros";
                      }
                    })()
                  : "Sin registros"}
              </div>
            </div>

            {/* Total cargos */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-2">TOTAL CARGOS</div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatCurrency(balance?.total_cargos || 0)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {(balance?.total_cargos ?? 0) > 0 ? "Periodo actual" : "Sin cargos"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery de imágenes del área privativa */}
      <ImageGallery images={images} title={`Imágenes de ${propiedad.nombre || "la Propiedad"}`} />
    </div>
  );
}
