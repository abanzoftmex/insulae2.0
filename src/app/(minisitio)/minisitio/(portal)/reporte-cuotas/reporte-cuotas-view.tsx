"use client";

import React, { useState } from "react";
import { AlertTriangle, Layers, MapPin, RefreshCw } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Paginator } from "@/components/minisitio/ui/paginator";
import { BUTTON } from "@/components/minisitio/ui/list-controls";
import type { FeesReport, FeesReportArea } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { getFeesReportAction } from "../../_actions/reports";
import {
  AreaStatusBadge,
  FinancialCards,
  toStatusColor,
  type VencimientoStatus,
} from "../_reportes/financial-cards";
import {
  FieldLabel,
  FilterPanel,
  KpiCard,
  LegendCard,
  LegendPill,
  ReportFootnote,
  ReportHeader,
  WideTableSection,
} from "../_reportes/report-chrome";

/** El reporte de cuotas capa `limit` a 50, así que 50 es el máximo. */
const REGISTROS_POR_PAGINA = [10, 30, 50];

const MESES = Array.from({ length: 12 }, (_, i) => i);

/** Importes P/C de una lista por grupo de cobro. */
interface MontoPorGrupo {
  propietario?: number;
  comercio?: number;
}

const formatCurrency = (amount: number | null | undefined) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount || 0);

/** Suma un campo (`propietario` | `comercio`) sobre una lista por grupo de cobro. */
const sumaGrupo = (lista: MontoPorGrupo[] | undefined, campo: keyof MontoPorGrupo) =>
  (lista || []).reduce((total, item) => total + (item[campo] || 0), 0);

/** Estado de vencimiento: 'normal' | 'vencido-naranja' | 'vencido-rojo' */
const getVencimientoStatus = (fechaVencimiento: string | null): VencimientoStatus => {
  if (!fechaVencimiento) return "normal";

  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diffTime = hoy.getTime() - vencimiento.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Si está vencido (días positivos)
  if (diffDays > 0) {
    const twoMonths = 60; // Aproximadamente 2 meses en días

    if (diffDays >= twoMonths) {
      return "vencido-rojo"; // Más de 2 meses vencido
    } else if (diffDays >= 1) {
      return "vencido-naranja"; // Entre 1 día y 2 meses vencido
    }
  }

  return "normal"; // Al corriente o futuro
};

/**
 * `FinancialCards` (igual que `renderFinancialCards` del panel) recibe UN solo color de
 * estado por celda, así que se toma el peor vencimiento entre propietario y comercio para
 * no perder el aviso de mora.
 */
const SEVERIDAD_VENCIMIENTO: Record<string, number> = { normal: 0, "vencido-naranja": 1, "vencido-rojo": 2 };
const peorVencimiento = (a: VencimientoStatus, b: VencimientoStatus) =>
  (SEVERIDAD_VENCIMIENTO[b] || 0) > (SEVERIDAD_VENCIMIENTO[a] || 0) ? b : a;

/** Cifras anual / mensual / saldo de un año para un área. */
const cifrasDelAnio = (area: FeesReportArea, year: number) => {
  // La API no manda cuota por año (`cuotasPorGrupo` es la última cuota vigente),
  // por eso todos los años comparten la misma base anual/mensual.
  const mensualProp = sumaGrupo(area.cuotasPorGrupo, "propietario");
  const mensualCom = sumaGrupo(area.cuotasPorGrupo, "comercio");
  // `saldos{year}PorGrupo` aún no lo envía la API: lectura genérica con fallback a 0
  // para que la columna se encienda sola cuando exista el dato.
  const saldos = (area as unknown as Record<string, MontoPorGrupo[] | undefined>)[`saldos${year}PorGrupo`] || [];

  return {
    anualProp: mensualProp * 12,
    anualCom: mensualCom * 12,
    mensualProp,
    mensualCom,
    saldoProp: sumaGrupo(saldos, "propietario"),
    saldoCom: sumaGrupo(saldos, "comercio"),
  };
};

/** Pagos de un mes concreto (índice 0-11) de un año para un área. */
const cifrasDelMes = (area: FeesReportArea, year: number, mesIdx: number) => {
  const pagos = area[`pagosMensuales${year}`] || [];

  return {
    prop: pagos.reduce((s, g) => s + (g.mesesPropietario?.[mesIdx] || 0), 0),
    com: pagos.reduce((s, g) => s + (g.mesesComercio?.[mesIdx] || 0), 0),
  };
};

/** Esqueleto de carga con la paleta pergamino del reporte. */
function ReporteSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 pb-5 border-b border-[#4c4a24]/20">
        <div className="h-8 w-80 max-w-full rounded-md bg-[#e0d5c8] animate-pulse" />
        <div className="h-3 w-56 max-w-full rounded bg-[#ece5d8] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`kpi-skeleton-${i}`}
            className="h-[86px] rounded-xl bg-white border border-[#c8b8a0]/40 shadow-xs animate-pulse"
          />
        ))}
      </div>
      <div className="h-12 rounded-card border border-[#c8b8a0]/40 bg-[#4c4a24]/10 animate-pulse" />
      <div className="h-[420px] rounded-card border border-[#c8b59d]/50 bg-white/88 animate-pulse" />
    </div>
  );
}

export function ReporteCuotasView({
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
    initialError ? { message: initialError, details: "Error al cargar el reporte de cuotas" } : null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData ? Math.ceil(initialData.total / initialLimit) : 1);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);

  // Columnas mensuales por año: salen de los CARGOS reales (crecen solas con la data)
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>(() =>
    initialData?.anios?.length ? initialData.anios : [new Date().getFullYear()],
  );

  const loadData = async (page: number, limit: number) => {
    setLoading(true);

    try {
      let result: FeesReport;
      try {
        result = await getFeesReportAction({ tipo: "ordinaria", page, limit });
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
      console.error("Error cargando reporte de cuotas:", error);
      setApiError({
        message: error instanceof Error ? error.message : String(error),
        details: "Error al cargar el reporte de cuotas"
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

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const limit = Number(event.target.value);
    setItemsPerPage(limit);
    setCurrentPage(1);
    loadData(1, limit);
  };

  if (loading && !data) {
    return <ReporteSkeleton />;
  }

  if (!data && apiError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-brand-accent mb-4" />
        <h2 className="mb-1 text-[18px] font-semibold text-fg">
          Error al cargar datos
        </h2>
        <p className="text-sm text-ink-soft mb-4">
          {apiError?.message || "Error desconocido"}
        </p>
        <button
          type="button"
          onClick={retryLoadData}
          className={BUTTON.primary}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return <ReporteSkeleton />;
  }

  const { apoles, total, totalUnidades } = data;
  const ultimaActualizacionTexto = data?.ultimaActualizacionTexto || 'No disponible';
  const unidadesEnSistema = totalUnidades || total;
  const anioAnterior = aniosDisponibles[0] - 1;

  // Filas planas en orden de jerarquía (fusión → AP → FAP) para poder calcular
  // los bordes de bloque `fap-block-start` / `fap-block-end` igual que el panel.
  // Hoy `areasFusion` y `hijos` llegan vacíos: el cálculo queda inerte pero correcto.
  const filasPlanas: { area: FeesReportArea; tipo: 'fusion' | 'apol' | 'hijo'; isChild: boolean }[] = [];
  apoles.forEach((apol) => {
    ((apol.areasFusion || []) as FeesReportArea[]).forEach((fusion) =>
      filasPlanas.push({ area: fusion, tipo: 'fusion', isChild: false })
    );
    filasPlanas.push({ area: apol, tipo: 'apol', isChild: false });
    ((apol.hijos || []) as FeesReportArea[]).forEach((hijo) =>
      filasPlanas.push({ area: hijo, tipo: 'hijo', isChild: true })
    );
  });

  // ====== TOTALES de la página actual ======
  const totales = {
    carteraProp: 0,
    carteraCom: 0,
    anticipadoProp: 0,
    anticipadoCom: 0,
    saldoProp: 0,
    saldoCom: 0,
    porAnio: {} as Record<number, { anualProp: number; anualCom: number; mensualProp: number; mensualCom: number; saldoProp: number; saldoCom: number }>,
    meses: {} as Record<number, { prop: number; com: number }[]>,
  };
  aniosDisponibles.forEach((year) => {
    totales.porAnio[year] = {
      anualProp: 0,
      anualCom: 0,
      mensualProp: 0,
      mensualCom: 0,
      saldoProp: 0,
      saldoCom: 0,
    };
    totales.meses[year] = MESES.map(() => ({ prop: 0, com: 0 }));
  });
  filasPlanas.forEach(({ area }) => {
    totales.carteraProp += sumaGrupo(area.carteraVencidaPorGrupo, "propietario");
    totales.carteraCom += sumaGrupo(area.carteraVencidaPorGrupo, "comercio");
    totales.anticipadoProp += sumaGrupo(area.pagosAnticipadosPorGrupo, "propietario");
    totales.anticipadoCom += sumaGrupo(area.pagosAnticipadosPorGrupo, "comercio");
    totales.saldoProp += sumaGrupo(area.saldosPorGrupo, "propietario");
    totales.saldoCom += sumaGrupo(area.saldosPorGrupo, "comercio");

    aniosDisponibles.forEach((year) => {
      const cifras = cifrasDelAnio(area, year);
      const acumulado = totales.porAnio[year];
      acumulado.anualProp += cifras.anualProp;
      acumulado.anualCom += cifras.anualCom;
      acumulado.mensualProp += cifras.mensualProp;
      acumulado.mensualCom += cifras.mensualCom;
      acumulado.saldoProp += cifras.saldoProp;
      acumulado.saldoCom += cifras.saldoCom;

      MESES.forEach((mesIdx) => {
        const mes = cifrasDelMes(area, year, mesIdx);
        totales.meses[year][mesIdx].prop += mes.prop;
        totales.meses[year][mesIdx].com += mes.com;
      });
    });
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* ── HEADER SUPERIOR ── */}
      <ReportHeader
        backSlot={<PageBackBadge className="mt-1.5 shrink-0" />}
        title="Estado de Cartera Ordinaria"
        subtitle={`${unidadesEnSistema} unidades privativas · Corte ${ultimaActualizacionTexto}`}
        actions={
          <button
            type="button"
            onClick={retryLoadData}
            className={BUTTON.secondary}
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
        />

        <KpiCard
          label="Ciclo Fiscal"
          value={`${aniosDisponibles[0]} – ${aniosDisponibles[aniosDisponibles.length - 1]}`}
          icon={<MapPin className="h-4 w-4" />}
          iconClassName="bg-gold-soft text-warning"
        />

        <LegendCard label="Simbología de Cobranza" className="col-span-1 md:col-span-2">
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
              onChange={handleItemsPerPageChange}
              className="h-9 w-full rounded-[10px] border border-stroke-2 bg-card px-2.5 text-[13.5px] text-fg outline-none transition-[border-color,box-shadow] duration-150 hover:border-stroke focus:border-brand/50 focus:ring-[3px] focus:ring-brand/15"
            >
              {REGISTROS_POR_PAGINA.map((cantidad) => (
                <option key={`limit-${cantidad}`} value={cantidad}>
                  {cantidad} por pág
                </option>
              ))}
            </select>
          </div>
        </div>
      </FilterPanel>

      {/* ── PAGINADOR ── */}
      <Paginator
        page={currentPage}
        totalPages={totalPages}
        totalRows={total}
        onPageChange={handlePageChange}
        isPending={loading}
      />

      {/* ── TABLA EXTENSIVA ── */}
      <WideTableSection>
        <table className="fap-inventory-table min-w-max border-separate border-spacing-0 text-sm">

          {/* THEAD */}
          <thead className="sticky top-0 z-30 shadow-sm">
            <tr className="bg-[#e0d5c8] text-left text-[12px] font-semibold text-[#5a4838]">
              <th className="sticky left-0 top-0 z-50 px-3 py-3 border-b border-r-2 border-[#c8b49a] bg-[#e0d5c8] min-w-[290px]">
                Área privativa / Fracción de área privativa
              </th>
              <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[160px]">
                Cartera vencida {anioAnterior}
              </th>
              <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[160px]">
                Pago anticipado {anioAnterior}
              </th>
              {aniosDisponibles.map((year) => (
                <React.Fragment key={`head-anio-${year}`}>
                  <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[180px]">
                    Cuotas ordinarias {year} (anual)
                  </th>
                  <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[180px]">
                    Cuotas ordinarias {year} (mensual)
                  </th>
                  <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[180px]">
                    Cuotas ordinarias {year} (saldo actual)
                  </th>
                </React.Fragment>
              ))}
              <th className="px-3 py-3 border-b border-[#d0b898] bg-[#f0e0c8] text-[#6a3810] font-bold text-center min-w-[180px]">
                Saldo actual
              </th>
              {aniosDisponibles.map((year) => (
                <React.Fragment key={`head-meses-${year}`}>
                  {MESES.map((mesIdx) => (
                    <th
                      key={`head-mes-${year}-${mesIdx}`}
                      className="px-3 py-3 border-b border-[#d8c8b4] bg-[#ece5d8] text-[11.5px] font-semibold text-[#7a5e44] text-center min-w-[110px] tabular-nums"
                    >
                      {String(mesIdx + 1).padStart(2, "0")}/{year}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* TBODY */}
          <tbody className="divide-y divide-[#e8ddd0] text-[#2b1e12]">
            {filasPlanas.map((fila, rowIdx) => {
              const { area, tipo, isChild } = fila;
              const siguiente = filasPlanas[rowIdx + 1];
              const isParent = !isChild && (siguiente?.isChild ?? false);

              const isBlockStart = isParent;
              const isBlockEnd = (isChild || isParent) && (!siguiente || !siguiente.isChild);

              const rowBg = isParent
                ? "bg-[#dfcfb9]"
                : isChild
                ? "bg-[#f0e6d6]"
                : "bg-white";

              const hasCommerce = !!area.tieneArrendamiento;

              // ====== Estado de vencimiento del área para TODA la fila ======
              let areaStatusProp: VencimientoStatus = 'normal';
              let areaStatusCom: VencimientoStatus = 'normal';

              if (area.saldosPorGrupo && area.saldosPorGrupo.length > 0) {
                let fechaVencimientoProp: string | null = null;
                let fechaVencimientoCom: string | null = null;

                area.saldosPorGrupo.forEach(s => {
                  if (s.fechaVencimientoProp) {
                    if (!fechaVencimientoProp || new Date(s.fechaVencimientoProp) < new Date(fechaVencimientoProp)) {
                      fechaVencimientoProp = s.fechaVencimientoProp;
                    }
                  }
                  if (s.fechaVencimientoCom) {
                    if (!fechaVencimientoCom || new Date(s.fechaVencimientoCom) < new Date(fechaVencimientoCom)) {
                      fechaVencimientoCom = s.fechaVencimientoCom;
                    }
                  }
                });

                areaStatusProp = getVencimientoStatus(fechaVencimientoProp);
                areaStatusCom = getVencimientoStatus(fechaVencimientoCom);
              }

              const areaStatusColor = toStatusColor(
                peorVencimiento(areaStatusProp, hasCommerce ? areaStatusCom : 'normal')
              );

              // Cartera vencida siempre es roja si hay monto (deuda de años anteriores, >2 meses)
              const carteraProp = sumaGrupo(area.carteraVencidaPorGrupo, "propietario");
              const carteraCom = sumaGrupo(area.carteraVencidaPorGrupo, "comercio");
              const carteraStatusColor =
                carteraProp > 0 || (hasCommerce && carteraCom > 0)
                  ? toStatusColor('vencido-rojo')
                  : undefined;

              const anticipadoProp = sumaGrupo(area.pagosAnticipadosPorGrupo, "propietario");
              const anticipadoCom = sumaGrupo(area.pagosAnticipadosPorGrupo, "comercio");
              const saldoProp = sumaGrupo(area.saldosPorGrupo, "propietario");
              const saldoCom = sumaGrupo(area.saldosPorGrupo, "comercio");

              return (
                <tr
                  key={`${tipo}-${area.id}`}
                  className={cn(
                    "h-12 border-t border-[#e8ddd0] transition-colors hover:brightness-[0.97] group",
                    rowBg,
                    isBlockStart && "fap-block-start",
                    isBlockEnd && "fap-block-end",
                    // Deshabilitado (id_cat_status = 4)
                    area.id_cat_status === 4 && "opacity-50"
                  )}
                >
                  {/* Sticky: Área Privativa / Fracción */}
                  <td
                    className={cn(
                      "sticky left-0 z-20 px-3 border-r-2 border-[#ddd0be] shadow-[2px_0_5px_rgba(30,18,8,0.02)] transition-colors",
                      rowBg
                    )}
                  >
                    <p className="font-bold text-[#2b1e12] leading-tight truncate">
                      {isChild ? `FAP: ${area.nombre}` : `AP: ${area.nombre}`}
                    </p>
                    {tipo === 'apol' && area.es_fusion === 1 && area.areasFusion?.length > 0 && (
                      <p className="text-[11.5px] font-medium text-[#7a5e44] leading-tight truncate">
                        Fusión de: {(area.areasFusion as FeesReportArea[]).map(f => f.nombre).join(', ')}
                      </p>
                    )}
                    <AreaStatusBadge label={area.status?.nombre} css={area.status?.css} />
                  </td>

                  {/* Cartera Vencida & Pago Anticipado */}
                  <td className="px-2 border-r border-[#e8ddd0] text-center">
                    <FinancialCards
                      owner={formatCurrency(carteraProp)}
                      commerce={formatCurrency(carteraCom)}
                      hasCommerce={hasCommerce}
                      statusColor={carteraStatusColor}
                    />
                  </td>
                  <td className="px-2 border-r border-[#e8ddd0] text-center">
                    <FinancialCards
                      owner={formatCurrency(anticipadoProp)}
                      commerce={formatCurrency(anticipadoCom)}
                      hasCommerce={hasCommerce}
                    />
                  </td>

                  {/* Tríptico por año: anual / mensual / saldo del año */}
                  {aniosDisponibles.map((year) => {
                    const cifras = cifrasDelAnio(area, year);

                    return (
                      <React.Fragment key={`fila-anio-${area.id}-${year}`}>
                        <td className="px-2 border-r border-[#e8ddd0] text-center">
                          <FinancialCards
                            owner={formatCurrency(cifras.anualProp)}
                            commerce={formatCurrency(cifras.anualCom)}
                            hasCommerce={hasCommerce}
                          />
                        </td>
                        <td className="px-2 border-r border-[#e8ddd0] text-center">
                          <FinancialCards
                            owner={formatCurrency(cifras.mensualProp)}
                            commerce={formatCurrency(cifras.mensualCom)}
                            hasCommerce={hasCommerce}
                          />
                        </td>
                        <td className="px-2 border-r border-[#e8ddd0] text-center">
                          <FinancialCards
                            owner={formatCurrency(cifras.saldoProp)}
                            commerce={formatCurrency(cifras.saldoCom)}
                            hasCommerce={hasCommerce}
                          />
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Saldo Actual Consolidado */}
                  <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8]/30 font-bold text-center">
                    <FinancialCards
                      owner={formatCurrency(saldoProp)}
                      commerce={formatCurrency(saldoCom)}
                      hasCommerce={hasCommerce}
                      statusColor={areaStatusColor}
                    />
                  </td>

                  {/* Columnas mensuales por año */}
                  {aniosDisponibles.map((year) => (
                    <React.Fragment key={`fila-meses-${area.id}-${year}`}>
                      {MESES.map((mesIdx) => {
                        const mes = cifrasDelMes(area, year, mesIdx);

                        return (
                          <td
                            key={`fila-mes-${area.id}-${year}-${mesIdx}`}
                            className="px-2 border-r border-[#e8ddd0] text-center"
                          >
                            <FinancialCards
                              owner={formatCurrency(mes.prop)}
                              commerce={formatCurrency(mes.com)}
                              hasCommerce={hasCommerce}
                              statusColor={areaStatusColor}
                            />
                          </td>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {/* TFOOT — Totales de la página actual */}
          <tfoot>
            <tr className="border-t-2 border-[#c8b49a] bg-[#e0d5c8] font-bold text-[#2b1e12]">
              <td className="sticky left-0 z-20 border-r-2 border-[#c8b49a] bg-[#e0d5c8] px-3 py-2 text-[13px] font-bold text-[#2b1e12]">
                Totales
              </td>

              <td className="px-2 border-r border-[#c8b49a] text-center">
                <FinancialCards
                  owner={formatCurrency(totales.carteraProp)}
                  commerce={formatCurrency(totales.carteraCom)}
                  hasCommerce
                />
              </td>
              <td className="px-2 border-r border-[#c8b49a] text-center">
                <FinancialCards
                  owner={formatCurrency(totales.anticipadoProp)}
                  commerce={formatCurrency(totales.anticipadoCom)}
                  hasCommerce
                />
              </td>

              {aniosDisponibles.map((year) => (
                <React.Fragment key={`total-anio-${year}`}>
                  <td className="px-2 border-r border-[#c8b49a] text-center">
                    <FinancialCards
                      owner={formatCurrency(totales.porAnio[year].anualProp)}
                      commerce={formatCurrency(totales.porAnio[year].anualCom)}
                      hasCommerce
                    />
                  </td>
                  <td className="px-2 border-r border-[#c8b49a] text-center">
                    <FinancialCards
                      owner={formatCurrency(totales.porAnio[year].mensualProp)}
                      commerce={formatCurrency(totales.porAnio[year].mensualCom)}
                      hasCommerce
                    />
                  </td>
                  <td className="px-2 border-r border-[#c8b49a] text-center">
                    <FinancialCards
                      owner={formatCurrency(totales.porAnio[year].saldoProp)}
                      commerce={formatCurrency(totales.porAnio[year].saldoCom)}
                      hasCommerce
                    />
                  </td>
                </React.Fragment>
              ))}

              <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8] text-center">
                <FinancialCards
                  owner={formatCurrency(totales.saldoProp)}
                  commerce={formatCurrency(totales.saldoCom)}
                  hasCommerce
                />
              </td>

              {aniosDisponibles.map((year) => (
                <React.Fragment key={`total-meses-${year}`}>
                  {MESES.map((mesIdx) => (
                    <td
                      key={`total-mes-${year}-${mesIdx}`}
                      className="px-2 border-r border-[#c8b49a] text-center"
                    >
                      <FinancialCards
                        owner={formatCurrency(totales.meses[year][mesIdx].prop)}
                        commerce={formatCurrency(totales.meses[year][mesIdx].com)}
                        hasCommerce
                      />
                    </td>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </WideTableSection>

      <ReportFootnote>
        Cartera ordinaria consolidada · {unidadesEnSistema} unidades en sistema
      </ReportFootnote>
    </div>
  );
}
