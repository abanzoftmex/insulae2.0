"use client";

import { useMemo, useState } from "react";
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils/cn';
import type { FinancialYears, ResumenFinanciero } from '@/modules/minisitio/infrastructure/queries/financials.queries';
import { getFinancialYearsAction, getResumenFinancieroAction } from '../../_actions/reports';
import { CompactFinancialTable, TABLE_TONE, type FinancialTable } from './compact-financial-table';
import { pickVisibleYears } from './visible-years';
import { StatStrip } from '@/components/minisitio/ui/stat-strip';
import { UnderlineTabs } from '@/components/minisitio/ui/tabs';

// Único condominio del minisitio: los endpoints financieros no devuelven su nombre.
const CONDOMINIO = "Val'Quirico";

// Nombres de los meses (mismas etiquetas que MONTH_LABELS del panel)
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Datos de un ejercicio: balance + cartera, ordinario + extraordinario. */
export type DatosAnio = ResumenFinanciero;

type Numeric = number | string | null | undefined;

/**
 * Grupo financiero tal como llega de balance-* (`meses` = [{ mes, total }]) o de cuentas-*
 * (`meses` = { 1..12 }, con `totalGeneral` / `totalAnualMeses`).
 */
interface GrupoFinanciero {
  nombre?: string | null;
  meses?: { mes: Numeric; total: Numeric }[] | Record<string, Numeric> | null;
  totalAnual?: Numeric;
  totalAnualMeses?: Numeric;
  totalGeneral?: Numeric;
}

interface BalanceAnio {
  ingresosMensuales?: GrupoFinanciero[];
  otrosIngresos?: GrupoFinanciero[];
  egresosMensuales?: GrupoFinanciero[];
}

// Función para formatear números como moneda mexicana
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(value);
};

// Función helper para parsear valores numéricos que pueden venir como strings
const parseNumericValue = (value: Numeric): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    // Eliminar comas y símbolos de moneda si existen
    const cleaned = value.replace(/[,$]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return value || 0;
};

/**
 * Los grupos llegan con `meses` como arreglo [{ mes, total }] (balance-*) o como
 * objeto { 1..12 } (cuentas-*). Se normaliza a un arreglo de 12 números.
 */
const mesesDeGrupo = (grupo: GrupoFinanciero | undefined): number[] => {
  const meses = grupo?.meses;
  return Array.from({ length: 12 }, (_, idx) => {
    const mes = idx + 1;
    if (Array.isArray(meses)) {
      return parseNumericValue(meses.find((m) => parseInt(String(m?.mes), 10) === mes)?.total);
    }
    if (meses && typeof meses === 'object') {
      return parseNumericValue(meses[mes] ?? meses[String(mes)]);
    }
    return 0;
  });
};

const totalDeGrupo = (grupo: GrupoFinanciero | undefined): number => {
  if (!grupo) return 0;
  if (grupo.totalAnual !== null && grupo.totalAnual !== undefined) return parseNumericValue(grupo.totalAnual);
  if (grupo.totalAnualMeses !== null && grupo.totalAnualMeses !== undefined) return parseNumericValue(grupo.totalAnualMeses);
  if (grupo.totalGeneral !== null && grupo.totalGeneral !== undefined) return parseNumericValue(grupo.totalGeneral);
  return mesesDeGrupo(grupo).reduce((sum, value) => sum + value, 0);
};

const sumTotales = (grupos: GrupoFinanciero[] | undefined) =>
  (grupos || []).reduce((sum, grupo) => sum + totalDeGrupo(grupo), 0);

const sumMeses = (grupos: GrupoFinanciero[] | undefined) =>
  (grupos || []).reduce(
    (acc, grupo) => {
      const meses = mesesDeGrupo(grupo);
      return acc.map((value, idx) => value + meses[idx]);
    },
    Array.from({ length: 12 }, () => 0)
  );

/**
 * Construye el shape { title, years, rows } de CompactFinancialTable fusionando
 * los grupos de todos los años cargados por nombre, para que las filas no bailen
 * entre ejercicios (un grupo presupuestal que no existe en un año vale 0).
 * `annualTotal` / `months` salen ya formateados; `annualTotalValue` queda numérico.
 */
function buildMergedTable({
  title,
  years,
  selector,
  totalLabel = 'Total'
}: {
  title: string;
  years: number[];
  selector: (year: number) => GrupoFinanciero[] | undefined;
  totalLabel?: string;
}): FinancialTable {
  const orden: string[] = [];
  const porNombre = new Map<string, Map<number, GrupoFinanciero>>();

  years.forEach((year) => {
    (selector(year) || []).forEach((grupo, idx) => {
      const nombre = String(grupo?.nombre || '').trim() || `Concepto ${idx + 1}`;
      if (!porNombre.has(nombre)) {
        porNombre.set(nombre, new Map());
        orden.push(nombre);
      }
      porNombre.get(nombre)!.set(year, grupo);
    });
  });

  const rows: FinancialTable['rows'] = orden.map((nombre, idx) => ({
    id: `fila-${idx}`,
    label: nombre,
    isTotal: false,
    yearly: years.map((year) => {
      const grupo = porNombre.get(nombre)!.get(year);
      const total = totalDeGrupo(grupo);
      return {
        year,
        annualTotal: formatCurrency(total),
        annualTotalValue: total,
        months: mesesDeGrupo(grupo).map((value) => formatCurrency(value))
      };
    })
  }));

  if (rows.length > 0) {
    rows.push({
      id: 'fila-total',
      label: totalLabel,
      isTotal: true,
      yearly: years.map((year) => {
        const grupos = selector(year) || [];
        const total = sumTotales(grupos);
        return {
          year,
          annualTotal: formatCurrency(total),
          annualTotalValue: total,
          months: sumMeses(grupos).map((value) => formatCurrency(value))
        };
      })
    });
  }

  return { title, years, rows };
}

/**
 * Tabla de saldo: fila "Total" (ingresos − egresos del año, mes a mes) y fila
 * "Bancos y caja" (el mismo neto pero acumulado dentro del año).
 */
function buildSaldoTable({
  title,
  years,
  balanceDe
}: {
  title: string;
  years: number[];
  balanceDe: (year: number) => BalanceAnio | undefined;
}): FinancialTable {
  const rows = [
    { id: 'saldo-total', label: 'Total', isTotal: true },
    { id: 'saldo-bancos', label: 'Bancos y caja', isTotal: false }
  ].map((row) => ({
    ...row,
    yearly: years.map((year) => {
      const balance = balanceDe(year);
      const ingresos = [
        ...(balance?.ingresosMensuales || []),
        ...(balance?.otrosIngresos || [])
      ];
      const egresos = balance?.egresosMensuales || [];
      const ingresosMeses = sumMeses(ingresos);
      const egresosMeses = sumMeses(egresos);
      const anual = sumTotales(ingresos) - sumTotales(egresos);

      let acumulado = 0;
      const months = ingresosMeses.map((ingresoMes, idx) => {
        const neto = ingresoMes - egresosMeses[idx];
        acumulado += neto;
        return formatCurrency(row.id === 'saldo-bancos' ? acumulado : neto);
      });

      return { year, annualTotal: formatCurrency(anual), annualTotalValue: anual, months };
    })
  }));

  return { title, years, rows };
}

const tablaTieneImportes = (table: FinancialTable) =>
  table.rows.some((row) => row.yearly.some((slice) => slice.annualTotalValue !== 0));

// Cartera ordinaria: cuota ordinaria + los demás grupos de cobro del año.
const carteraOrdinariaDe = (yearData: DatosAnio | undefined): GrupoFinanciero[] => {
  const ordinarias = yearData?.cuentasOrdinarias?.ordinarias;
  if (!ordinarias) return [];
  const grupos: GrupoFinanciero[] = [];
  if (ordinarias.cuotasOrdinarias) grupos.push(ordinarias.cuotasOrdinarias);
  ((ordinarias.otrosGrupos || []) as GrupoFinanciero[]).forEach((grupo) => grupos.push(grupo));
  return grupos;
};

const carteraExtraordinariaDe = (yearData: DatosAnio | undefined) =>
  (yearData?.cuentasExtraordinarias?.extraordinarias?.grupos || []) as GrupoFinanciero[];

/** Texto de "última actualización" si alguna de las cuatro piezas lo trae. */
const textoActualizacion = (pieza: unknown) =>
  (pieza as { ultimaActualizacionTexto?: unknown } | null | undefined)?.ultimaActualizacionTexto;

export function ResumenFinancieroView({
  initialAnios,
  initialAnio,
  initialDatosPorAnio,
  initialError,
}: {
  initialAnios: number[];
  initialAnio: number;
  initialDatosPorAnio: Record<number, DatosAnio>;
  initialError: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Tríptico visible: los 3 ejercicios más recientes con datos.
  const [anios, setAnios] = useState<number[]>(initialAnios);
  const [anio, setAnio] = useState(initialAnio);
  const [modo, setModo] = useState<'ordinary' | 'extraordinary'>('ordinary');
  const [datosPorAnio, setDatosPorAnio] = useState<Record<number, DatosAnio>>(initialDatosPorAnio);

  const esOrdinario = modo === 'ordinary';

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Años con datos reales.
      let dataAnios: FinancialYears | null = null;
      try {
        dataAnios = await getFinancialYearsAction();
      } catch (e) {
        console.error('Error al cargar los años disponibles:', e);
      }

      // 2) Recorte a los 3 ejercicios más recientes (tríptico fijo, igual que el panel).
      const { visibles, seleccionado } = pickVisibleYears(dataAnios);
      setAnios(visibles);
      setAnio(seleccionado);

      // 3) Un ejercicio por llamada: se cargan los 3 en paralelo.
      const entradas = await Promise.all(
        visibles.map(async (year) => [year, await getResumenFinancieroAction(year)] as const)
      );
      setDatosPorAnio(Object.fromEntries(entradas));
    } catch (e) {
      console.error('Error al cargar datos:', e);
      setError('Error al cargar los datos financieros. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const ultimaActualizacionTexto = useMemo(() => {
    const yearData = datosPorAnio[anio];
    const candidates = [
      textoActualizacion(yearData?.balanceOrdinarias),
      textoActualizacion(yearData?.cuentasOrdinarias),
      textoActualizacion(yearData?.balanceExtraordinarias),
      textoActualizacion(yearData?.cuentasExtraordinarias)
    ];

    return candidates.find((value): value is string => typeof value === 'string' && value.trim() !== '') || 'No disponible';
  }, [datosPorAnio, anio]);

  const tablasOrdinarias = useMemo(() => {
    const balanceDe = (year: number): BalanceAnio | undefined => datosPorAnio[year]?.balanceOrdinarias;
    return {
      ingresos: buildMergedTable({
        title: 'Cuotas a Áreas Privativas (Cobranza Condominal)',
        years: anios,
        selector: (year) => balanceDe(year)?.ingresosMensuales
      }),
      otrosIngresos: buildMergedTable({
        title: 'Otros Ingresos (Catálogo de Ingresos Diversos)',
        years: anios,
        selector: (year) => balanceDe(year)?.otrosIngresos
      }),
      egresos: buildMergedTable({
        title: 'Egresos mensuales',
        years: anios,
        selector: (year) => balanceDe(year)?.egresosMensuales
      }),
      saldo: buildSaldoTable({
        title: 'Saldo Ingresos - Egresos Ordinarios',
        years: anios,
        balanceDe
      }),
      cartera: buildMergedTable({
        title: 'Cuentas por cobrar - Ingresos Cuotas Ordinarias',
        years: anios,
        selector: (year) => carteraOrdinariaDe(datosPorAnio[year])
      })
    };
  }, [datosPorAnio, anios]);

  const tablasExtraordinarias = useMemo(() => {
    const balanceDe = (year: number): BalanceAnio | undefined => datosPorAnio[year]?.balanceExtraordinarias;
    return {
      ingresos: buildMergedTable({
        title: 'Ingresos Extraordinarios',
        years: anios,
        selector: (year) => balanceDe(year)?.ingresosMensuales
      }),
      otrosIngresos: buildMergedTable({
        title: 'Otros Ingresos Extraordinarios',
        years: anios,
        selector: (year) => balanceDe(year)?.otrosIngresos
      }),
      egresos: buildMergedTable({
        title: 'Egresos Extraordinarios',
        years: anios,
        selector: (year) => balanceDe(year)?.egresosMensuales
      }),
      saldo: buildSaldoTable({
        title: 'Saldo Consolidado',
        years: anios,
        balanceDe
      }),
      cartera: buildMergedTable({
        title: 'Cuentas por cobrar - Cuotas extraordinarias',
        years: anios,
        selector: (year) => carteraExtraordinariaDe(datosPorAnio[year])
      })
    };
  }, [datosPorAnio, anios]);

  // KPI del año seleccionado, en el modo activo.
  const kpi = useMemo(() => {
    const balance: BalanceAnio | undefined = esOrdinario
      ? datosPorAnio[anio]?.balanceOrdinarias
      : datosPorAnio[anio]?.balanceExtraordinarias;

    const ingresos = sumTotales(balance?.ingresosMensuales);
    const otrosIngresos = sumTotales(balance?.otrosIngresos);
    const egresos = sumTotales(balance?.egresosMensuales);
    const ingresosTotales = ingresos + otrosIngresos;

    // Extraordinarias cargadas: acumulado de todos los años visibles.
    const extraordinariasAcumuladas = anios.reduce(
      (sum, year) => sum + sumTotales(datosPorAnio[year]?.balanceExtraordinarias?.ingresosMensuales),
      0
    );

    return {
      ingresos,
      otrosIngresos,
      egresos,
      ingresosTotales,
      balanceAnual: ingresosTotales - egresos,
      extraordinariasAcumuladas
    };
  }, [datosPorAnio, anio, anios, esOrdinario]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="animate-spin rounded-full border-b-2 border-brand h-12 w-12"></div>
        <p className="text-sm text-ink-soft">Cargando...</p>
        <p className="text-sm font-medium text-ink-soft/70">Procesando información</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-danger/25 bg-danger/10 p-4">
        <h2 className="text-xl font-bold text-danger mb-2">Error</h2>
        <p className="text-sm font-medium text-danger">{error}</p>
        <Button variant="destructive"size="sm"className="mt-4"onClick={fetchAllData}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Tipo de cuota y año; el título ya lo pone el shell. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-stroke-3">
        <UnderlineTabs
          label="Tipo de cuota"
          value={esOrdinario ? 'ordinary' : 'extraordinary'}
          onChange={(value) => setModo(value)}
          layoutId="rf-modo-tab"
          options={[
            { id: 'ordinary' as const, label: 'Cuotas ordinarias' },
            { id: 'extraordinary' as const, label: 'Cuotas extraordinarias' },
          ]}
        />
        {anios.length > 1 && (
          <div role="group" aria-label="Año" className="mb-1.5 flex gap-1">
            {anios.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setAnio(year)}
                aria-pressed={anio === year}
                className={cn(
                  'inline-flex h-7 items-center rounded-ctrl px-2.5 text-[13px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  anio === year ? 'bg-brand text-white' : 'text-fg-2 hover:bg-surface-3',
                )}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-caption text-fg-3">
        {[CONDOMINIO, `Corte ${anio}`, ultimaActualizacionTexto !== 'No disponible' && ultimaActualizacionTexto, 'Datos consolidados de Insulae 2.0'].filter(Boolean).join(' · ')}
      </p>

      <StatStrip
        label={`Resumen ${anio}`}
        items={[
          esOrdinario
            ? { id: 'ingresos', label: 'Ingresos ordinarios', value: formatCurrency(kpi.ingresos) }
            : { id: 'ingresos', label: 'Extraordinarios', value: formatCurrency(kpi.ingresos) },
          { id: 'otros', label: 'Otros ingresos', value: formatCurrency(kpi.otrosIngresos) },
          { id: 'totales', label: 'Ingresos totales', value: formatCurrency(kpi.ingresosTotales) },
          { id: 'egresos', label: 'Egresos totales', value: formatCurrency(kpi.egresos) },
          {
            id: 'balance',
            label: 'Balance anual',
            value: formatCurrency(kpi.balanceAnual),
            tone: kpi.balanceAnual < 0 ? 'overdue' : kpi.balanceAnual > 0 ? 'success' : undefined,
          },
          esOrdinario
            ? { id: 'cuotas', label: `Cuotas ordinarias ${anio}`, value: formatCurrency(kpi.ingresos) }
            : { id: 'cuotas', label: `Extraordinarias desde ${anios[0]}`, value: formatCurrency(kpi.extraordinariasAcumuladas) },
        ]}
      />

      {/* Main Content Sections */}
      <div className="space-y-6">
        {esOrdinario ? (
          <>
            <CompactFinancialTable
              title="Balance Mensual"
              subtitle={tablasOrdinarias.ingresos.title}
              firstColumnLabel="Tipo de Cobro"
              annualLabelPrefix="Ingreso Anual"
              table={tablasOrdinarias.ingresos}
              monthLabels={MESES}
              tone={TABLE_TONE.income}
            />

            <CompactFinancialTable
              title="Balance Mensual"
              subtitle={tablasOrdinarias.otrosIngresos.title}
              firstColumnLabel="Concepto de Ingreso"
              annualLabelPrefix="Ingreso Anual"
              table={tablasOrdinarias.otrosIngresos}
              monthLabels={MESES}
              tone={TABLE_TONE.income}
            />

            <CompactFinancialTable
              title="Corte Mensual"
              subtitle={tablasOrdinarias.egresos.title}
              firstColumnLabel="Tipo de Egreso"
              annualLabelPrefix="Egreso"
              table={tablasOrdinarias.egresos}
              monthLabels={MESES}
              tone={TABLE_TONE.expense}
            />

            <CompactFinancialTable
              title="Balance Ordinario"
              subtitle={tablasOrdinarias.saldo.title}
              firstColumnLabel="Saldo"
              annualLabelPrefix="Total Anual"
              table={tablasOrdinarias.saldo}
              monthLabels={MESES}
              tone={TABLE_TONE.balance}
            />

            {tablaTieneImportes(tablasOrdinarias.cartera) && (
              <CompactFinancialTable
                title="Control de Cartera"
                subtitle={tablasOrdinarias.cartera.title}
                firstColumnLabel="Tipo de Ingreso"
                annualLabelPrefix="Periodo"
                table={tablasOrdinarias.cartera}
                monthLabels={MESES}
                tone={TABLE_TONE.income}
              />
            )}
          </>
        ) : (
          <>
            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle={tablasExtraordinarias.ingresos.title}
              firstColumnLabel="Tipo de Ingreso"
              annualLabelPrefix="Total"
              table={tablasExtraordinarias.ingresos}
              monthLabels={MESES}
              tone={TABLE_TONE.income}
            />

            {tablasExtraordinarias.otrosIngresos.rows.length > 0 && (
              <CompactFinancialTable
                title="Balance Extraordinario"
                subtitle={tablasExtraordinarias.otrosIngresos.title}
                firstColumnLabel="Tipo de Ingreso"
                annualLabelPrefix="Total"
                table={tablasExtraordinarias.otrosIngresos}
                monthLabels={MESES}
                tone={TABLE_TONE.income}
              />
            )}

            {tablasExtraordinarias.egresos.rows.length > 0 && (
              <CompactFinancialTable
                title="Balance Extraordinario"
                subtitle={tablasExtraordinarias.egresos.title}
                firstColumnLabel="Tipo de Egreso"
                annualLabelPrefix="Total"
                table={tablasExtraordinarias.egresos}
                monthLabels={MESES}
                tone={TABLE_TONE.expense}
              />
            )}

            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle={tablasExtraordinarias.saldo.title}
              firstColumnLabel="Concepto"
              annualLabelPrefix="Periodo"
              table={tablasExtraordinarias.saldo}
              monthLabels={MESES}
              tone={TABLE_TONE.balance}
            />

            {tablaTieneImportes(tablasExtraordinarias.cartera) && (
              <CompactFinancialTable
                title="Control de Cartera"
                subtitle={tablasExtraordinarias.cartera.title}
                firstColumnLabel="Tipo de Ingreso"
                annualLabelPrefix="Periodo"
                table={tablasExtraordinarias.cartera}
                monthLabels={MESES}
                tone={TABLE_TONE.income}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
