"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, HandCoins, RefreshCw, Search, Store, X } from "lucide-react";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { ViewToggle } from "@/components/minisitio/view-toggle";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import type { ListView } from "@/stores/minisitio.store";
import type { RentalsList } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { ArrendamientosTable } from "./arrendamientos-table";
import { parseNum, type ArrendamientoView } from "./arrendamientos-types";

/** Mis Comercios (antes pages/arrendamientos.js). Los datos llegan del servidor en la primera carga. */
export function ArrendamientosView({ initialData }: { initialData: RentalsList }) {
  const router = useRouter();
  const { user, userType, setArrendamientos } = useMinisitioAuth();
  const arrendamientosData: ArrendamientoView[] = initialData.arrendamientos;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState<ListView>("table");
  const puedeVer = userType === "arrendatario" || userType === "both";

  // Siempre forzar vista de tabla - no guardar preferencia
  // useEffect eliminado para evitar cargar preferencias guardadas en caché

  // Filtrar datos cuando cambie el término de búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return arrendamientosData;
    return arrendamientosData.filter(
      (arrendamiento) =>
        arrendamiento.nombre_comercio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.razon_social_comercio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.clase_comercio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.area_privativa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.direccion_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.contacto_administrativo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.contacto_contable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arrendamiento.id_arrendamientos?.toString().includes(searchTerm) ||
        arrendamiento.folio_861?.toString().includes(searchTerm),
    );
  }, [searchTerm, arrendamientosData]);

  // Calcular estadísticas financieras
  const stats = useMemo(() => {
    const arrendamientos = arrendamientosData;
    const totalArrendamientos = arrendamientos.length;
    const activos = arrendamientos.filter((a) => a.id_cat_status_comercios === 1).length;
    const conSaldoPendiente = arrendamientos.filter((a) => parseNum(a.saldo_pendiente || 0) > 0).length;

    // Usar los datos calculados específicamente para saldo vencido
    const conSaldoVencido = initialData.saldoVencidoData?.arrendamientosConSaldoVencido || 0;
    const totalSaldoPendiente = arrendamientos.reduce((sum, a) => sum + parseNum(a.saldo_pendiente || 0), 0);
    const totalSaldoVencido = initialData.saldoVencidoData?.totalSaldoVencido || 0;

    // Calcular totales de m² y indiviso
    const totalM2Construccion = arrendamientos.reduce((sum, a) => sum + (parseNum(a.m2_construccion) || 0), 0);
    const totalIndiviso = arrendamientos.reduce((sum, a) => sum + (parseNum(a.indiviso) || 0), 0);
    const totalIndivisoFAP = arrendamientos.reduce((sum, a) => {
      return sum + (a.indiviso_fap_condominio !== null ? parseNum(a.indiviso_fap_condominio) : 0);
    }, 0);

    return {
      total: totalArrendamientos,
      activos,
      conSaldoPendiente,
      conSaldoVencido,
      totalSaldoPendiente,
      totalSaldoVencido,
      totalM2Construccion,
      totalIndiviso,
      totalIndivisoFAP,
    };
  }, [arrendamientosData, initialData.saldoVencidoData]);

  useEffect(() => {
    if (!user) return;

    if (userType !== "arrendatario" && userType !== "both") {
      router.push(msPath("/"));
      return;
    }

    setArrendamientos(arrendamientosData); // Actualizar store
  }, [user, userType, router, setArrendamientos, arrendamientosData]);

  const handleViewChange = (newView: ListView) => {
    setCurrentView(newView);
    // No guardar preferencia - siempre forzar tabla al recargar
  };

  const formatCurrency = (amount: unknown) => {
    const value = parseNum(amount) || 0;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  // El legacy dejaba el spinner mientras redirigía a quien no tiene comercios
  if (!puedeVer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-primary-dark rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mis Comercios</h1>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-primary-light rounded-lg p-3 mr-4 flex-shrink-0">
                <Store className="w-6 h-6 text-primary-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-900">Total Comercios</p>
                <p className="text-xs text-gray-700 mt-1">{stats.activos} activos</p>
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-700">
                    M² Construcción: <span className="font-semibold">{stats.totalM2Construccion.toFixed(2)} m²</span>
                  </p>
                  <p className="text-xs text-gray-700">
                    Indiviso Total: <span className="font-semibold">{stats.totalIndiviso.toFixed(4)}%</span>
                  </p>
                  <p className="text-xs text-blue-700">
                    Indiviso FAP/Cond.: <span className="font-semibold">{stats.totalIndivisoFAP.toFixed(4)}%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-red-500 rounded-lg p-3 mr-4 flex-shrink-0">
                <HandCoins className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-red-700">{stats.conSaldoPendiente}</p>
                <p className="text-sm text-red-700">Con Saldo Pendiente</p>
                <p className="text-xs text-red-700 mt-1 font-black">{formatCurrency(stats.totalSaldoPendiente)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-green-500 rounded-lg p-3 mr-4 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-green-700">
                  {Math.max(0, (stats.total || 0) - (stats.conSaldoPendiente || 0))}
                </p>
                <p className="text-sm text-green-700">Al Corriente</p>
                <p className="text-xs text-green-700 font-black mt-1">Sin adeudos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      {arrendamientosData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre comercial, razón social, área privativa, contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              {filteredData.length} resultado{filteredData.length !== 1 ? "s" : ""} encontrado{filteredData.length !== 1 ? "s" : ""} para &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Control de vista */}
      {arrendamientosData.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {searchTerm ? filteredData.length : arrendamientosData.length} Comercio{(searchTerm ? filteredData.length : arrendamientosData.length) !== 1 ? "s" : ""} {searchTerm ? "encontrado" : ""}{(searchTerm ? filteredData.length : arrendamientosData.length) !== 1 && searchTerm ? "s" : ""}
          </h2>
          <ViewToggle view={currentView} onViewChange={handleViewChange} />
        </div>
      )}

      {/* Contenido según vista */}
      <div className="space-y-6">
        {Array.isArray(arrendamientosData) && arrendamientosData.length > 0 ? (
          filteredData.length > 0 ? (
            currentView === "grid" ? (
              /* Vista de tarjetas */
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredData.map((arrendamiento, index) => (
                  <div
                    key={arrendamiento?.id_arrendamientos ?? index}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200"
                  >
                    {/* Header con información principal */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                            {arrendamiento?.nombre_comercio || "Sin nombre"}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {arrendamiento?.razon_social_comercio || "Sin razón social"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Información detallada */}
                    <div className="p-6 space-y-4">
                      {/* Sección de Ubicación */}
                      <div className="bg-gray-50 rounded-md p-3">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Ubicación</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Área:</span>
                            <span className="font-medium text-gray-900 truncate ml-2">
                              {arrendamiento?.area_privativa || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Superficie:</span>
                            <span className="font-medium text-gray-900">
                              {arrendamiento?.superficie ? `${parseNum(arrendamiento.superficie).toFixed(2)} m²` : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">M² Construcción:</span>
                            <span className="font-medium text-gray-900">
                              {arrendamiento?.m2_construccion
                                ? `${parseNum(arrendamiento.m2_construccion).toFixed(2)} m²`
                                : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Indiviso:</span>
                            <span className="font-medium text-gray-900">
                              {(parseNum(arrendamiento?.indiviso) || 0).toFixed(4)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Indiviso FAP/Cond.:</span>
                            <span className="font-medium text-blue-600">
                              {arrendamiento?.indiviso_fap_condominio !== null
                                ? `${parseNum(arrendamiento?.indiviso_fap_condominio).toFixed(4)}%`
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Inicio:</span>
                            <span className="font-medium text-gray-900">
                              {arrendamiento?.fecha_inicio
                                ? (() => {
                                    try {
                                      const d = new Date(arrendamiento.fecha_inicio);
                                      return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("es-MX");
                                    } catch {
                                      return "N/A";
                                    }
                                  })()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sección de Contactos */}
                      <div className="bg-gray-50 rounded-md p-3">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Contactos</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-600 block">Administrativo:</span>
                            <span className="text-sm font-medium text-gray-900 truncate block">
                              {arrendamiento?.contacto_administrativo || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600 block">Contable:</span>
                            <span className="text-sm font-medium text-gray-900 truncate block">
                              {arrendamiento?.contacto_contable || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex space-x-2">
                        <Link
                          href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}`)}
                          className="flex-1 bg-primary-dark text-white text-center py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-primary-light hover:text-primary-dark transition-colors duration-200"
                        >
                          Ver Detalle
                        </Link>
                        <Link
                          href={msPath(`/arrendamientos/${arrendamiento?.id_arrendamientos}/estado-cuenta`)}
                          className="flex-1 bg-gray-100 text-gray-700 text-center py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
                        >
                          Estado de Cuenta
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Vista de tabla */
              <ArrendamientosTable arrendamientos={filteredData} />
            )
          ) : (
            /* Estado vacío cuando no hay coincidencias en el filtro */
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mx-auto mb-4 rounded-full">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay resultados con los filtros aplicados</h3>
              <p className="text-gray-600 mb-6">
                Ajusta los criterios de búsqueda o limpia los filtros para ver más resultados.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 inline-flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </button>
            </div>
          )
        ) : (
          /* Estado vacío cuando no hay arrendamientos */
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mx-auto mb-4 rounded-full">
              <Store className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes arrendamientos registrados</h3>
            <p className="text-gray-600 mb-6">Cuando tengas arrendamientos activos aparecerán aquí.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 inline-flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
