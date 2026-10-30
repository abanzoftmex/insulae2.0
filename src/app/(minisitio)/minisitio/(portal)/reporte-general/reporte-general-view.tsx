"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Building2,
  Store,
  Search,
  X,
  Download,
  RefreshCw,
} from "lucide-react";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import type { GeneralReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { toast } from "@/stores/minisitio-toast.store";
import { getGeneralReportAction } from "../../_actions/reports";
import { buildReporteGeneralPdf, formatCurrency, meses, reporteGeneralPdfFileName } from "./reporte-general-pdf";

type AreaReporte = GeneralReport["areas"][number];
type Estadisticas = Partial<GeneralReport["estadisticas"]>;

export function ReporteGeneralView({
  initialAreas,
  initialEstadisticas,
}: {
  initialAreas: AreaReporte[];
  initialEstadisticas: Estadisticas;
}) {
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<AreaReporte[]>(initialAreas);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>(initialEstadisticas);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroZona, setFiltroZona] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Aplicar filtros
  const filteredAreas = useMemo(() => {
    let filtered = areas;

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (area) =>
          area.identificador
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          area.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          area.zona?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          area.uso_suelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          area.id?.toString().includes(searchTerm)
      );
    }

    // Filtro por tipo
    if (filtroTipo !== "todos") {
      filtered = filtered.filter(
        (area) => area.tipo.toLowerCase() === filtroTipo
      );
    }

    // Filtro por zona
    if (filtroZona !== "todas") {
      filtered = filtered.filter((area) => area.zona === filtroZona);
    }

    // Filtro por estado financiero
    if (filtroEstado !== "todos") {
      filtered = filtered.filter(
        (area) => area.estado_financiero === filtroEstado
      );
    }

    return filtered;
  }, [searchTerm, filtroTipo, filtroZona, filtroEstado, areas]);

  const fetchReporteGeneral = async () => {
    try {
      setLoading(true);
      const data = await getGeneralReportAction();
      setAreas(data.areas || []);
      setEstadisticas(data.estadisticas || {});
    } catch (error) {
      console.error("Error fetching reporte general:", error);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = async () => {
    try {
      const doc = await buildReporteGeneralPdf(filteredAreas);

      // Guardar el PDF
      doc.save(reporteGeneralPdfFileName());
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast("No se pudo generar el PDF. Inténtalo otra vez.", "error");
    }
  };

  // Obtener listas únicas para filtros
  const zonasUnicas = [...new Set(areas.map((area) => area.zona))]
    .filter(Boolean)
    .sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Principal - Estilo Profesional */}
      <div className="bg-white border border-line rounded-none shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-line">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Reporte General de Cuotas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Todas las áreas - <span className="font-bold text-overdue">Información confidencial</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportarPDF}
                className="bg-overdue text-white px-4 py-2 rounded-none text-sm font-medium hover:bg-red-700 transition-colors duration-200 inline-flex items-center border border-stroke"
              >
                <Download className="w-4 h-4 mr-2"/>
                Exportar PDF
              </button>
              <button
                onClick={fetchReporteGeneral}
                className="bg-gray-600 text-white px-4 py-2 rounded-none text-sm font-medium hover:bg-gray-700 transition-colors duration-200 inline-flex items-center border border-gray-700"
              >
                <RefreshCw className="w-4 h-4 mr-2"/>
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas Principales */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-stroke pl-4">
              <dt className="text-xs font-medium text-gray-500">
                Total Áreas con Adeudos
              </dt>
              <dd className="mt-1 text-2xl tabular-nums font-bold text-gray-900">
                {estadisticas.total_areas || 0}
              </dd>
              <dd className="text-xs text-gray-600">
                {estadisticas.total_propiedades || 0} propiedades,{" "}
                {estadisticas.total_arrendamientos || 0} arrendamientos
              </dd>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <dt className="text-xs font-medium text-gray-500">
                Saldo Pendiente Total
              </dt>
              <dd className="mt-1 text-2xl tabular-nums font-bold text-overdue">
                {formatCurrency(estadisticas.total_saldo_pendiente)}
              </dd>
              <dd className="text-xs text-overdue">Todos los adeudos</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white border border-line rounded-none shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"/>
            <input
              type="text"
              placeholder="Buscar área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-none text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4"/>
              </button>
            )}
          </div>

          {/* Filtro por tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-gray-300 rounded-none px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
          >
            <option value="todos">Todos los tipos</option>
            <option value="propiedad">Solo Propiedades</option>
            <option value="arrendamiento">Solo Arrendamientos</option>
          </select>

          {/* Filtro por zona */}
          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="border border-gray-300 rounded-none px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
          >
            <option value="todas">Todas las zonas</option>
            {zonasUnicas.map((zona) => (
              <option key={zona} value={zona}>
                {zona}
              </option>
            ))}
          </select>

          {/* Filtro por estado financiero */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-none px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
          >
            <option value="todos">Todos los estados</option>
            <option value="vencido">Vencido</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>

        {filteredAreas.length !== areas.length && (
          <div className="text-sm text-gray-600 tabular-nums">
            Mostrando {filteredAreas.length} de {areas.length} áreas
          </div>
        )}
      </div>

      {/* Tabla de Resultados */}
      {filteredAreas.length > 0 ? (
        <div className="bg-white border border-line rounded-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand sticky left-0 bg-gray-50 z-10">
                    Área Privativa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-brand">
                    Saldo Anual
                  </th>
                  {meses.map((mes, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-right text-xs font-semibold text-brand whitespace-nowrap"
                    >
                      {mes}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-line">
                {filteredAreas.map((area, index) => (
                  <tr
                    key={area.id}
                    className={index % 2 === 0 ?"bg-white":"bg-gray-50"}
                  >
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-inherit z-10">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-full">
                          {area.tipo === "Propiedad" ? (
                            <Building2 className="h-4 w-4 text-gray-600"/>
                          ) : (
                            <Store className="h-4 w-4 text-gray-600"/>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {area.identificador}
                          </div>
                          <div className="text-xs text-gray-500">
                            {area.tipo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {area.status}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums font-bold text-overdue">
                      {formatCurrency(area.saldo_pendiente)}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                      <td
                        key={mes}
                        className="px-4 py-3 text-sm text-right tabular-nums text-gray-700"
                      >
                        {formatCurrency(area.meses[mes] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Estado vacío */
        <div className="bg-white border border-line rounded-none shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mx-auto mb-4 rounded-full">
            <FileText className="w-8 h-8 text-gray-400"/>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {areas.length === 0
              ? "No hay áreas con adeudos"
              : "No hay resultados con los filtros aplicados"}
          </h3>
          <p className="text-gray-600 mb-6">
            {areas.length === 0
              ? "Todas las áreas están al corriente con sus pagos."
              : "Ajusta los filtros de búsqueda para ver más resultados."}
          </p>
          <button
            onClick={fetchReporteGeneral}
            className="bg-brand-deep text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 inline-flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2"/>
            Actualizar
          </button>
        </div>
      )}

      {/* Resumen por Zona (si hay datos) */}
      {estadisticas.estadisticas_por_zona &&
        Object.keys(estadisticas.estadisticas_por_zona).length > 0 && (
          <div className="bg-white border border-line rounded-none shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resumen por Zona
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(estadisticas.estadisticas_por_zona).map(
                ([zona, stats]) => (
                  <div
                    key={zona}
                    className="border border-line p-4 bg-gray-50"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">{zona}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Áreas:</span>
                        <span className="tabular-nums font-bold">
                          {stats.total_areas}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pendiente:</span>
                        <span className="tabular-nums font-bold text-overdue">
                          {formatCurrency(stats.saldo_pendiente)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
    </div>
  );
}
