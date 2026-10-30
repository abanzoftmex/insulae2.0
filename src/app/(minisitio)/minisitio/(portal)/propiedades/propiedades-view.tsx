"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Building2, FileText, Search, TrendingUp, X } from "lucide-react";
import { StatusBadge } from "@/components/minisitio/status-badge";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { ViewToggle } from "@/components/minisitio/view-toggle";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import type { ListView } from "@/stores/minisitio.store";
import type { PropertiesList } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { PropiedadesTable } from "./propiedades-table";
import { IndivisoInfo } from "./indiviso-info";
import { generatePropertiesReportPdf } from "./propiedades-report-pdf";
import { tieneReferencia } from "./propiedades-organizer";
import { fechaAyer, parseNum, type PropiedadView } from "./propiedades-format";

/** Mis Propiedades (antes pages/propiedades.js). Los datos llegan del servidor en la primera carga. */
export function PropiedadesView({
  initialData,
  proyecto,
}: {
  initialData: PropertiesList;
  /** null si no se pudo obtener (el legacy seguía con el total de m² por defecto). */
  proyecto: ProjectInfo | null;
}) {
  const router = useRouter();
  const { user, userType, setPropiedades } = useMinisitioAuth();
  const propiedadesData: PropiedadView[] = initialData.propiedades;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState<ListView>("table");
  const totalM2Proyecto = proyecto ? proyecto.totalM2 : 157850.23; // Valor por defecto
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const ultimaActualizacionTexto = initialData.ultimaActualizacionTexto || "No disponible";
  const puedeVer = userType === "propietario" || userType === "both";

  // Siempre forzar vista de tabla - no guardar preferencia
  // useEffect eliminado para evitar cargar preferencias guardadas en caché

  // Filtrar datos aplicando búsqueda (el servidor ya devuelve solo propiedades activas)
  const filteredData = useMemo(() => {
    let filtered = [...propiedadesData];

    // Aplicar filtro de búsqueda por texto
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (propiedad) =>
          propiedad.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          propiedad.iniciales?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          propiedad.zona?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          propiedad.uso_suelo?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [searchTerm, propiedadesData]);

  useEffect(() => {
    if (!user) return;

    if (userType !== "propietario" && userType !== "both") {
      router.push(msPath("/"));
      return;
    }

    setPropiedades(propiedadesData); // Actualizar store
  }, [userType, user, router, setPropiedades, propiedadesData]);

  const handleViewChange = (newView: ListView) => {
    setCurrentView(newView);
    // No guardar preferencia - siempre forzar tabla al recargar
  };

  const clearAllFilters = () => {
    setSearchTerm("");
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatM2 = (m2: unknown) => {
    const value = parseNum(m2) || 0;
    return `${value.toLocaleString("es-MX", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })} m²`;
  };

  const getStatusBadge = (statusId: number) => {
    // Mapear IDs de status a tipos para el badge
    const statusMap: Record<number, number> = {
      1: 1, // Activo -> Verde
      2: 3, // Inactivo -> Rojo
      3: 2, // Pendiente -> Amarillo
    };
    return statusMap[statusId] || 2;
  };

  const getFinancialStatusBadge = (estadoSaldo: string) => {
    // Mapear estado financiero real a badge
    const statusMap: Record<string, number> = {
      vencido: 3, // Rojo
      pendiente: 2, // Amarillo
      a_favor: 1, // Verde
      al_corriente: 1, // Verde
    };
    return statusMap[estadoSaldo] || 2;
  };

  const getPropertyStatusBadge = (statusName: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      Activo: { color: "bg-green-100 text-green-800", text: "Activo" },
      Inactivo: { color: "bg-red-100 text-red-800", text: "Inactivo" },
      Pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
      "Sin status": { color: "bg-gray-100 text-gray-800", text: "Sin status" },
    };

    const config = statusMap[statusName] || statusMap["Sin status"];
    return config;
  };

  // Función para generar el reporte PDF de propiedades
  const generatePropertiesReport = async () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No hay propiedades para generar el reporte.");
      return;
    }

    setGeneratingPDF(true);

    try {
      await generatePropertiesReportPdf({ propiedades: filteredData, proyecto, user });
    } catch (error) {
      console.error("Error generando reporte PDF:", error);
      alert("Error al generar el reporte PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // El legacy dejaba el spinner mientras redirigía a quien no es propietario
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
            <h1 className="text-2xl font-bold">Mis Propiedades</h1>
            <p className="text-gray-300 mt-1">Gestiona y monitorea tus propiedades</p>
            <p className="text-gray-300 text-sm mt-1">
              Ultima actualizacion: <span className="font-semibold text-white">{ultimaActualizacionTexto}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-primary-light bg-opacity-20 rounded-lg p-3">
              <Building2 className="w-8 h-8 text-white mr-3" />
              <div>
                <p className="text-2xl font-bold">{filteredData.filter((prop) => prop.id_cat_status === 1).length}</p>
                <p className="text-sm text-gray-200">Propiedades Activas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-primary-light rounded-lg p-3 mr-4 flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-primary-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-gray-900">
                  {filteredData
                    .filter((prop) => prop.id_cat_status === 1) // Solo propiedades activas
                    .reduce((total, prop) => {
                      const esFAP = tieneReferencia(prop.id_areas_privativas_padre);
                      const m2Totales = parseNum(prop.m2_totales) || 0;
                      const m2Construccion = parseNum(prop.m2_construccion) || 0;

                      // En FAPs el valor principal de superficie viene en m2_construccion.
                      const superficie = esFAP ? m2Construccion || m2Totales : m2Totales;
                      return total + superficie;
                    }, 0)
                    .toLocaleString("es-MX")}{" "}
                  m²
                </p>
                <p className="text-sm text-gray-900">Metros Cuadrados Totales</p>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-primary-light rounded-lg p-3 mr-4 flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-primary-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-gray-900">
                  {filteredData
                    .filter((prop) => prop.id_cat_status === 1) // Solo propiedades activas
                    .reduce((total, prop) => {
                      const indiviso = parseNum(prop.indiviso) || 0;
                      const indivisoFapCondominio = parseNum(prop.indiviso_fap_condominio) || 0;
                      return total + indiviso + indivisoFapCondominio;
                    }, 0)
                    .toFixed(4)}
                  %
                </p>
                <div className="text-sm text-gray-900 flex items-center">
                  Indiviso total de las areas privativas
                  <span className="ml-2">
                    <IndivisoInfo totalM2Proyecto={totalM2Proyecto} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Saldo Pendiente */}
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-yellow-500 rounded-lg p-3 mr-4 flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(
                    filteredData
                      .filter((prop) => prop.id_cat_status === 1) // Solo propiedades activas
                      .reduce((total, prop) => {
                        const pendiente = parseNum(prop.saldo_pendiente) || 0;
                        return total + pendiente;
                      }, 0),
                  )}
                </p>
                <p className="text-sm text-gray-900">Saldo Pendiente</p>
                <p className="text-xs text-gray-700 mt-1">Total de cuotas por pagar</p>
              </div>
            </div>
          </div>

          {/* Card de Saldo Vencido */}
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-start">
              <div className="bg-red-500 rounded-lg p-3 mr-4 flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(
                    filteredData
                      .filter((prop) => prop.id_cat_status === 1) // Solo propiedades activas
                      .reduce((total, prop) => {
                        const vencido = parseNum(prop.saldo_vencido) || 0;
                        return total + vencido;
                      }, 0),
                  )}
                </p>
                <p className="text-sm text-gray-900">Saldo Vencido</p>
                <p className="text-xs text-gray-700 mt-1">
                  Al {fechaAyer({ day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      {propiedadesData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barra de búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, iniciales, barrio o uso de suelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={clearAllFilters}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Información de búsqueda aplicada */}
          {searchTerm && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                <Search className="w-3 h-3 mr-1" />"{searchTerm}":{" "}
                {filteredData.length} resultado
                {filteredData.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Control de vista y acciones */}
      {propiedadesData.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredData.length} Propiedad
            {filteredData.length !== 1 ? "es" : ""} Activa
            {filteredData.length !== 1 ? "s" : ""} {searchTerm ? "(filtrada)" : ""}
          </h2>

          <div className="flex items-center gap-3">
            {/* Botón para generar reporte PDF */}
            <button
              onClick={generatePropertiesReport}
              disabled={generatingPDF || filteredData.length === 0}
              className="inline-flex items-center px-4 py-2 bg-primary-dark text-white text-sm font-medium rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-primary-dark"
            >
              {generatingPDF ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generar Reporte PDF
                </>
              )}
            </button>

            {/* Control de vista */}
            <ViewToggle view={currentView} onViewChange={handleViewChange} />
          </div>
        </div>
      )}

      {/* Contenido según vista */}
      {filteredData.length > 0 ? (
        currentView === "grid" ? (
          /* Vista de tarjetas */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredData.map((propiedad) => (
              <div
                key={propiedad.id_areas_privativas}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  {/* Header de la tarjeta */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{propiedad.nombre}</h3>
                      <p className="text-sm text-gray-500">{propiedad.iniciales}</p>
                    </div>
                    <StatusBadge status={getFinancialStatusBadge(propiedad.estado_saldo)} type="payment" />
                  </div>

                  {/* Información principal */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getPropertyStatusBadge(propiedad.status_nombre).color
                        }`}
                      >
                        {getPropertyStatusBadge(propiedad.status_nombre).text}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Barrio:</span>
                      <span className="font-medium text-gray-900">{propiedad.zona || "Sin barrio"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Uso de suelo:</span>
                      <span className="font-medium text-gray-900">{propiedad.uso_suelo || "Sin uso definido"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">M² Totales:</span>
                      <span className="font-medium text-gray-900">{formatM2(propiedad.m2_totales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">M² Construidos:</span>
                      <span className="font-medium text-gray-900">{formatM2(propiedad.m2_construccion)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Indiviso:</span>
                      {propiedad.indiviso !== null ? (
                        <span className="font-medium text-primary-dark">
                          {(parseNum(propiedad.indiviso) || 0).toFixed(4)}%
                        </span>
                      ) : (
                        <span className="font-medium text-primary-dark">0.0000%</span>
                      )}
                    </div>
                    {propiedad.indiviso_fap_condominio !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Indiviso FAP/Cond.:</span>
                        <span className="font-medium text-blue-600">
                          {propiedad.indiviso_fap_condominio.toFixed(4)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Saldo vencido */}
                  <div
                    className={`rounded-lg p-3 mb-4 border-l-4 ${
                      (parseNum(propiedad.saldo_vencido) || 0) > 0
                        ? "bg-red-50 border-red-500"
                        : "bg-green-50 border-green-500"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          Saldo Vencido al {fechaAyer({ day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            (parseNum(propiedad.saldo_vencido) || 0) > 0
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {(parseNum(propiedad.saldo_vencido) || 0) > 0 ? "Vencido" : "Al Corriente"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Vencido</span>
                        <span
                          className={`font-bold ${
                            (parseNum(propiedad.saldo_vencido) || 0) > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatCurrency(propiedad.saldo_vencido || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex space-x-2">
                    <Link
                      href={msPath(`/propiedades/${propiedad.id_areas_privativas}`)}
                      className="flex-1 bg-primary-dark text-white text-center py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-primary-light hover:text-primary-dark transition-colors duration-200"
                    >
                      Ver Detalle
                    </Link>
                    <Link
                      href={msPath(`/propiedades/${propiedad.id_areas_privativas}/estado-cuenta`)}
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
          <PropiedadesTable
            propiedades={filteredData}
            formatCurrency={formatCurrency}
            formatM2={formatM2}
            getStatusBadge={getStatusBadge}
            getFinancialStatusBadge={getFinancialStatusBadge}
          />
        )
      ) : searchTerm ? (
        /* Sin resultados de búsqueda */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron propiedades</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? `No hay propiedades activas que coincidan con "${searchTerm}"`
              : "No se encontraron propiedades activas"}
          </p>
          <button
            onClick={clearAllFilters}
            className="bg-primary-dark text-white px-6 py-2 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        /* Estado vacío - sin propiedades */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes propiedades asignadas</h3>
          <p className="text-gray-600 mb-6">Contacta al administrador si crees que esto es un error.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-dark text-white px-6 py-2 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200"
          >
            Actualizar
          </button>
        </div>
      )}
    </div>
  );
}
