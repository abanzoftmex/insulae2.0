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
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
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
      <div className="rounded-2xl border border-stroke-2 bg-card">
        <div className="rounded-t-2xl border-b border-stroke-3 bg-surface-2 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              {/* h2: el h1 de la pantalla es el título del encabezado del portal. */}
              <h2 className="text-lg font-semibold text-fg">
                Reporte General de Cuotas
              </h2>
              <p className="text-sm text-fg-3 mt-1">
                Todas las áreas · <span className="font-bold text-overdue">Información confidencial</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={exportarPDF}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-stroke-2 bg-card px-4 text-[13.5px] font-semibold text-fg-2 outline-none transition-[background-color,border-color] duration-150 hover:border-stroke hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 disabled:opacity-50 [&>svg]:mr-0 [&>svg]:text-overdue"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </button>
              <button
                onClick={fetchReporteGeneral}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas Principales */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-[3px] border-overdue pl-4">
              <dt className="text-xs font-medium text-fg-3">
                Total Áreas con Adeudos
              </dt>
              <dd className="mt-1 text-2xl tabular-nums font-bold text-fg">
                {estadisticas.total_areas || 0}
              </dd>
              <dd className="text-xs text-fg-3">
                {estadisticas.total_propiedades || 0} propiedades,{" "}
                {estadisticas.total_arrendamientos || 0} arrendamientos
              </dd>
            </div>

            <div className="border-l-[3px] border-brand-accent pl-4">
              <dt className="text-xs font-medium text-fg-3">
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
      <div className="rounded-2xl border border-stroke-2 bg-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fg-4 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-stroke rounded-none text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fg-4 hover:text-fg-3"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro por tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-stroke rounded-none px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
          >
            <option value="todos">Todos los tipos</option>
            <option value="propiedad">Solo Propiedades</option>
            <option value="arrendamiento">Solo Arrendamientos</option>
          </select>

          {/* Filtro por zona */}
          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="border border-stroke rounded-none px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
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
            className="border border-stroke rounded-none px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 tabular-nums"
          >
            <option value="todos">Todos los estados</option>
            <option value="vencido">Vencido</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>

        {filteredAreas.length !== areas.length && (
          <div className="text-sm text-fg-3 tabular-nums">
            Mostrando {filteredAreas.length} de {areas.length} áreas
          </div>
        )}
      </div>

      {/* Tabla de Resultados */}
      {filteredAreas.length > 0 ? (
        <div className="rounded-2xl border border-stroke-2 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand sticky left-0 bg-surface-2 z-10">
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
                    className={index % 2 === 0 ? "bg-white" : "bg-surface-2"}
                  >
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-inherit z-10">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-surface-3 rounded-full">
                          {area.tipo === "Propiedad" ? (
                            <Building2 className="h-4 w-4 text-fg-3" />
                          ) : (
                            <Store className="h-4 w-4 text-fg-3" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-fg">
                            {area.identificador}
                          </div>
                          <div className="text-xs text-fg-3">
                            {area.tipo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-fg">
                      {area.status}
                    </td>
                    {/* Teja solo si hay adeudo: con todo en rojo, un $0.00 parecía deuda. */}
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums font-semibold ${
                        Number(area.saldo_pendiente) > 0 ? "text-overdue" : "text-fg-4"
                      }`}
                    >
                      {formatCurrency(area.saldo_pendiente)}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                      <td
                        key={mes}
                        className="px-4 py-3 text-sm text-right tabular-nums text-fg-2"
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
        <div className="rounded-2xl border border-stroke-2 bg-card p-12 text-center">
          <div className="w-16 h-16 bg-surface-3 flex items-center justify-center mx-auto mb-4 rounded-full">
            <FileText className="w-8 h-8 text-fg-4" />
          </div>
          <h3 className="text-lg font-medium text-fg mb-2">
            {areas.length === 0
              ? "No hay áreas con adeudos"
              : "No hay resultados con los filtros aplicados"}
          </h3>
          <p className="text-fg-3 mb-6">
            {areas.length === 0
              ? "Todas las áreas están al corriente con sus pagos."
              : "Ajusta los filtros de búsqueda para ver más resultados."}
          </p>
          <button
            onClick={fetchReporteGeneral}
            className="bg-brand-deep text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 inline-flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      )}

      {/* Resumen por Zona (si hay datos) */}
      {estadisticas.estadisticas_por_zona &&
        Object.keys(estadisticas.estadisticas_por_zona).length > 0 && (
          <div className="rounded-2xl border border-stroke-2 bg-card p-6">
            <h3 className="text-lg font-semibold text-fg mb-4">
              Resumen por Zona
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(estadisticas.estadisticas_por_zona).map(
                ([zona, stats]) => (
                  <div
                    key={zona}
                    className="border border-line p-4 bg-surface-2"
                  >
                    <h4 className="font-medium text-fg mb-2">{zona}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-fg-3">Áreas:</span>
                        <span className="tabular-nums font-bold">
                          {stats.total_areas}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-3">Pendiente:</span>
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
