"use client";

import { useState } from "react";
import { AlertTriangle, Layers, MapPin, RefreshCw } from "lucide-react";
import { FinancialReportSkeleton } from "@/components/minisitio/skeleton-loaders";
import { cn } from "@/shared/utils/cn";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Paginator } from "@/components/minisitio/ui/paginator";
import type { FeesReport, FeesReportArea } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { getFeesReportAction } from "../../_actions/reports";
import {
  FinancialCards,
  AreaStatusBadge,
  toStatusColor,
  type VencimientoStatus,
} from "../_reportes/financial-cards";
import {
  ReportHeader,
  KpiCard,
  LegendCard,
  LegendPill,
  FilterPanel,
  FieldLabel,
  WideTableSection,
  ReportFootnote,
} from "../_reportes/report-chrome";

type FilaPlana = { area: FeesReportArea; tipo: 'fusion' | 'apol' | 'hijo' };

const formatCurrency = (amount: number | null | undefined) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

// Función para calcular el estado de vencimiento
const getVencimientoStatus = (fechaVencimiento: string | null): VencimientoStatus => {
  if (!fechaVencimiento) return 'normal';

  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diffTime = hoy.getTime() - vencimiento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Si está vencido (días positivos)
  if (diffDays > 0) {
    const twoMonths = 60; // Aproximadamente 2 meses en días

    if (diffDays >= twoMonths) {
      return 'vencido-rojo'; // Más de 2 meses vencido
    } else if (diffDays >= 1) {
      return 'vencido-naranja'; // Entre 1 día y 2 meses vencido
    }
  }

  return 'normal'; // Al corriente o futuro
};

export function ReporteCuotasExtraordinariaView({
  initialData,
  initialLimit,
  initialError,
}: {
  initialData: FeesReport | null;
  initialLimit: number;
  initialError: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FeesReport | null>(initialData);
  const [apiError, setApiError] = useState<{ message: string; details: string } | null>(
    initialError ? { message: initialError, details: "Error al cargar el reporte de cuotas extraordinarias" } : null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData ? Math.ceil(initialData.total / initialLimit) : 1);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit); // Mostrar más filas por página

  // Columnas mensuales por año: salen de los CARGOS reales (crecen solas con la data)
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>(() =>
    initialData?.anios?.length ? initialData.anios : [new Date().getFullYear()],
  );

  const loadData = async (page: number, limit: number) => {
    setLoading(true);

    try {
      let result: FeesReport;
      try {
        result = await getFeesReportAction({ tipo: "extraordinaria", page, limit });
      } catch {
        throw new Error("Error al cargar reporte");
      }

      setData(result);
      setTotalPages(Math.ceil(result.total / limit));

      // Años de columnas = años con cargos reales (crece solo cuando llega 2027)
      if (result.anios?.length) {
        setAniosDisponibles(result.anios);
      }
    } catch (error) {
      console.error("Error cargando reporte de cuotas extraordinarias:", error);
      setApiError({
        message: error instanceof Error ? error.message : String(error),
        details: "Error al cargar el reporte de cuotas extraordinarias",
      });
    } finally {
      setLoading(false);
    }
  };

  const retryLoadData = () => {
    setApiError(null);
    setData(null);
    setCurrentPage(1);
    setLoading(true);
    loadData(1, itemsPerPage);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      loadData(newPage, itemsPerPage);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    loadData(1, value);
  };

  if (loading && !data) {
    return <FinancialReportSkeleton />;
  }

  if (!data && apiError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-brand-accent" />
        <h2 className="text-lg font-bold uppercase tracking-tight text-brand">
          Error al cargar datos
        </h2>
        <p className="text-sm text-ink-soft">
          {apiError?.message || "Error desconocido"}
        </p>
        <button
          type="button"
          onClick={retryLoadData}
          className="mt-2 inline-flex items-center gap-2 rounded-pill bg-brand px-6 py-2 text-sm font-semibold text-white transition-standard active-scale hover:bg-brand-uplift"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return <FinancialReportSkeleton />;
  }

  const { apoles = [], total, totalUnidades, gruposCobro = [] } = data;
  const ultimaActualizacionTexto = data?.ultimaActualizacionTexto || 'No disponible';
  const unidadesEnSistema = totalUnidades || total;
  const primerAnio = aniosDisponibles[0];
  const ultimoAnio = aniosDisponibles[aniosDisponibles.length - 1];

  // Columnas mensuales planas: 12 por cada año con cargos (sin acordeón, como el panel)
  const monthColumns = aniosDisponibles.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 }))
  );

  // Filas planas en el orden histórico del minisitio: fusiones, APOL, FAPs
  const flatRows: FilaPlana[] = [];
  apoles.forEach((apol) => {
    ((apol.areasFusion || []) as FeesReportArea[]).forEach((fusion) => flatRows.push({ area: fusion, tipo: 'fusion' }));
    flatRows.push({ area: apol, tipo: 'apol' });
    ((apol.hijos || []) as FeesReportArea[]).forEach((hijo) => flatRows.push({ area: hijo, tipo: 'hijo' }));
  });

  const areasDeLaPagina = flatRows.map((entry) => entry.area);

  // Las extraordinarias del portal solo publican el lado Propietario:
  // el bloque C únicamente aparece si el área tiene arrendamiento Y llega importe real.
  const showCommerce = (area: FeesReportArea | undefined, comercio: number | undefined) =>
    Boolean(area?.tieneArrendamiento) && Number(comercio || 0) !== 0;

  const pageTieneArrendamiento = areasDeLaPagina.some((area) => area?.tieneArrendamiento);

  const sumaCuotaGrupo = (area: FeesReportArea, grupoId: string) => {
    const cuota = (area.cuotasPorGrupo || []).find((c) => c.id_grupo === grupoId);
    return { prop: cuota?.propietario || 0, com: cuota?.comercio || 0 };
  };

  const computeSaldoActual = (area: FeesReportArea): { prop: number; com: number; status: VencimientoStatus } => {
    const saldos = area.saldosPorGrupo || [];
    const totalPropietario = saldos.reduce((sum, s) => sum + (s.propietario || 0), 0);
    const totalComercio = saldos.reduce((sum, s) => sum + (s.comercio || 0), 0);

    // En cuotas extraordinarias solo importa el saldo del propietario:
    // si es 0 (o 0 por redondeo) la unidad está sin deuda.
    if (totalPropietario === 0 || Math.abs(totalPropietario) < 0.01) {
      return { prop: totalPropietario, com: totalComercio, status: 'sin-deuda' };
    }

    // Si hay saldo, manda la fecha de vencimiento más antigua (la más crítica)
    let fechaVencimientoMasAntigua: string | null = null;
    saldos.forEach((s) => {
      if (s.fechaVencimientoProp) {
        if (!fechaVencimientoMasAntigua || new Date(s.fechaVencimientoProp) < new Date(fechaVencimientoMasAntigua)) {
          fechaVencimientoMasAntigua = s.fechaVencimientoProp;
        }
      }
      if (s.fechaVencimientoCom) {
        if (!fechaVencimientoMasAntigua || new Date(s.fechaVencimientoCom) < new Date(fechaVencimientoMasAntigua)) {
          fechaVencimientoMasAntigua = s.fechaVencimientoCom;
        }
      }
    });

    return {
      prop: totalPropietario,
      com: totalComercio,
      status: getVencimientoStatus(fechaVencimientoMasAntigua),
    };
  };

  const sumaMes = (area: FeesReportArea, year: number, month: number) => {
    const pagos = area[`pagosMensuales${year}`] || [];
    return {
      prop: pagos.reduce((sum, g) => sum + (g.mesesPropietario?.[month - 1] || 0), 0),
      com: pagos.reduce((sum, g) => sum + (g.mesesComercio?.[month - 1] || 0), 0),
    };
  };

  // TOTALES de la página actual (el panel sí trae fila de totales)
  const totalesPorGrupo = gruposCobro.map((grupo) =>
    areasDeLaPagina.reduce(
      (acc, area) => {
        const { prop, com } = sumaCuotaGrupo(area, grupo.id);
        return { prop: acc.prop + prop, com: acc.com + com };
      },
      { prop: 0, com: 0 }
    )
  );

  const totalSaldoActual = areasDeLaPagina.reduce(
    (acc, area) => {
      const { prop, com } = computeSaldoActual(area);
      return { prop: acc.prop + prop, com: acc.com + com };
    },
    { prop: 0, com: 0 }
  );

  const totalesPorMes = monthColumns.map(({ year, month }) =>
    areasDeLaPagina.reduce(
      (acc, area) => {
        const { prop, com } = sumaMes(area, year, month);
        return { prop: acc.prop + prop, com: acc.com + com };
      },
      { prop: 0, com: 0 }
    )
  );

  const renderRow = (entry: FilaPlana, rowIdx: number) => {
    const { area, tipo } = entry;
    const isChild = tipo !== 'apol';
    const nextEntry = flatRows[rowIdx + 1];
    const nextIsChild = nextEntry ? nextEntry.tipo !== 'apol' : false;
    const isParent = !isChild && nextIsChild;

    const isBlockStart = isParent;
    const isBlockEnd = (isChild || isParent) && !nextIsChild;

    const rowBg = isParent
      ? "bg-[#dfcfb9]"
      : isChild
      ? "bg-[#f0e6d6]"
      : "bg-white";

    const saldo = computeSaldoActual(area);

    return (
      <tr
        key={`${tipo}-${area.id}`}
        className={cn(
          "h-12 border-t border-[#e8ddd0] transition-colors hover:brightness-[0.97] group",
          rowBg,
          isBlockStart && "fap-block-start",
          isBlockEnd && "fap-block-end",
          // id_cat_status 4 = deshabilitada
          area.id_cat_status === 4 && "opacity-50"
        )}
      >
        {/* Sticky Column: Área Privativa / Fracción */}
        <td
          className={cn(
            "sticky left-0 z-20 px-3 border-r-2 border-[#ddd0be] shadow-[2px_0_5px_rgba(30,18,8,0.02)] transition-colors",
            rowBg
          )}
        >
          <p className="font-bold text-[#2b1e12] leading-tight truncate">
            {tipo === 'hijo' ? `FAP: ${area.nombre}` : `AP: ${area.nombre}`}
          </p>
          {tipo === 'apol' && area.es_fusion === 1 && (area.areasFusion || []).length > 0 && (
            <p className="text-[10px] font-semibold text-[#7a5e44] leading-tight truncate">
              Fusión de: {(area.areasFusion as FeesReportArea[]).map((f) => f.nombre).join(', ')}
            </p>
          )}
          <AreaStatusBadge label={area.status?.nombre} css={area.status?.css || ""} />
        </td>

        {/* Cuotas Base Extraordinarias por grupo de cobro */}
        {gruposCobro.map((grupo) => {
          const { prop, com } = sumaCuotaGrupo(area, grupo.id);
          return (
            <td key={`cuota-${grupo.id}-${area.id}`} className="px-2 border-r border-[#e8ddd0] text-center">
              <FinancialCards
                owner={formatCurrency(prop)}
                commerce={formatCurrency(com)}
                hasCommerce={showCommerce(area, com)}
              />
            </td>
          );
        })}

        {/* Saldo Actual Consolidado */}
        <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8]/30 font-bold text-center">
          <FinancialCards
            owner={formatCurrency(saldo.prop)}
            commerce={formatCurrency(saldo.com)}
            hasCommerce={showCommerce(area, saldo.com)}
            statusColor={toStatusColor(saldo.status)}
          />
        </td>

        {/* Celdas mensuales (12 por año con cargos) */}
        {monthColumns.map(({ year, month }) => {
          const { prop, com } = sumaMes(area, year, month);
          return (
            <td
              key={`mc-ext-${year}-${month}-${area.id}`}
              className="px-2 border-r border-[#e8ddd0] text-center"
            >
              <FinancialCards
                owner={formatCurrency(prop)}
                commerce={formatCurrency(com)}
                hasCommerce={showCommerce(area, com)}
              />
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* ── HEADER SUPERIOR ── */}
      <ReportHeader
        backSlot={<PageBackBadge className="mt-1.5 shrink-0" />}
        title="Estado de Cartera Extraordinaria"
        subtitle={`${unidadesEnSistema} unidades privativas · Corte ${ultimaActualizacionTexto}`}
        actions={
          <button
            type="button"
            onClick={retryLoadData}
            disabled={loading}
            className="inline-flex items-center justify-center whitespace-nowrap h-8 gap-2 px-3 text-[10px] font-bold uppercase rounded-full border border-[#c8b8a0] bg-white text-[#5a4838] hover:bg-[#faf6f0] transition-standard active-scale disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
        }
      />

      {/* ── TARJETAS KPI ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Unidades"
          value={unidadesEnSistema}
          icon={<Layers className="h-4 w-4" />}
          iconClassName="bg-[#4c4a24]"
        />

        <KpiCard
          label="Ciclo Fiscal"
          value={`${primerAnio} – ${ultimoAnio}`}
          icon={<MapPin className="h-4 w-4" />}
          iconClassName="bg-[#0e7490]"
        />

        <LegendCard label="Simbología de Extraordinarias" className="col-span-1 md:col-span-2">
          <LegendPill tone="owner">P: Propietario</LegendPill>
          <LegendPill tone="commerce">C: Comercio</LegendPill>
          <LegendPill tone="ok">Al corriente</LegendPill>
          <LegendPill tone="warn">Vencido 1 día – 2 meses</LegendPill>
          <LegendPill tone="late">Vencido +2 meses</LegendPill>
        </LegendCard>
      </div>

      {/* ── BARRA DE FILTROS ── */}
      <FilterPanel>
        <div className="p-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <FieldLabel>Registros por página</FieldLabel>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="h-8 w-full rounded-md border border-[#c8b8a0]/50 bg-white px-2 text-xs font-medium outline-none"
            >
              <option value={10}>10 por pág</option>
              <option value={30}>30 por pág</option>
              <option value={50}>50 por pág</option>
            </select>
          </div>
        </div>
      </FilterPanel>

      {/* ── PAGINADOR NÚMEROS (CIRCULAR) ── */}
      <Paginator
        page={currentPage}
        totalPages={totalPages}
        totalRows={total}
        onPageChange={handlePageChange}
        isPending={loading}
        rowsLabel="unidades"
      />

      {/* ── TABLA EXTENSIVA ── */}
      <WideTableSection>
        <table className="fap-inventory-table min-w-max border-separate border-spacing-0 text-sm">

          {/* THEAD */}
          <thead className="sticky top-0 z-30 shadow-sm">
            <tr className="bg-[#e0d5c8] text-left text-[10px] font-bold uppercase tracking-widest text-[#5a4838]">
              <th className="sticky left-0 top-0 z-50 px-3 py-3 border-b border-r-2 border-[#c8b49a] bg-[#e0d5c8] min-w-[290px]">
                ÁREA PRIVATIVA/ FRACCIÓN DE ÁREA PRIVATIVA
              </th>

              {gruposCobro.map((grupo) => (
                <th
                  key={`grupo-${grupo.id}`}
                  className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[220px]"
                >
                  {grupo.nombre} {primerAnio} - {ultimoAnio}
                </th>
              ))}

              <th className="px-3 py-3 border-b border-[#d0b898] bg-[#f0e0c8] text-[#6a3810] font-bold text-center min-w-[180px]">
                SALDO ACTUAL
              </th>

              {monthColumns.map(({ year, month }) => (
                <th
                  key={`mh-${year}-${month}`}
                  className="px-3 py-3 border-b border-[#d8c8b4] bg-[#ece5d8] text-[9px] font-semibold text-[#7a5e44] text-center min-w-[110px]"
                >
                  {String(month).padStart(2, "0")}/{year}
                </th>
              ))}
            </tr>
          </thead>

          {/* TBODY */}
          <tbody className="divide-y divide-[#e8ddd0] text-[#2b1e12]">
            {flatRows.map((entry, rowIdx) => renderRow(entry, rowIdx))}
          </tbody>

          {/* TFOOT — Totales de la página actual */}
          <tfoot>
            <tr className="border-t-2 border-[#c8b49a] bg-[#e0d5c8] font-bold text-[#2b1e12]">
              <td className="sticky left-0 z-20 border-r-2 border-[#c8b49a] bg-[#e0d5c8] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#2b1e12]">
                TOTALES
              </td>

              {gruposCobro.map((grupo, idx) => (
                <td key={`tot-grupo-${grupo.id}`} className="px-2 border-r border-[#c8b49a] text-center">
                  <FinancialCards
                    owner={formatCurrency(totalesPorGrupo[idx]?.prop)}
                    commerce={formatCurrency(totalesPorGrupo[idx]?.com)}
                    hasCommerce={pageTieneArrendamiento && Number(totalesPorGrupo[idx]?.com || 0) !== 0}
                  />
                </td>
              ))}

              <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8] text-center">
                <FinancialCards
                  owner={formatCurrency(totalSaldoActual.prop)}
                  commerce={formatCurrency(totalSaldoActual.com)}
                  hasCommerce={pageTieneArrendamiento && Number(totalSaldoActual.com || 0) !== 0}
                />
              </td>

              {monthColumns.map(({ year, month }, idx) => (
                <td key={`tot-ext-mc-${year}-${month}`} className="px-2 border-r border-[#c8b49a] text-center">
                  <FinancialCards
                    owner={formatCurrency(totalesPorMes[idx]?.prop)}
                    commerce={formatCurrency(totalesPorMes[idx]?.com)}
                    hasCommerce={pageTieneArrendamiento && Number(totalesPorMes[idx]?.com || 0) !== 0}
                  />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </WideTableSection>

      <ReportFootnote>
        Cartera extraordinaria consolidada &middot; {unidadesEnSistema} unidades en sistema
      </ReportFootnote>
    </div>
  );
}
