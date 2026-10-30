"use client";

import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { FinancialReportSkeleton, TableSkeleton } from "@/components/minisitio/skeleton-loaders";
import { msPath } from "@/components/minisitio/paths";
import { buttonClass } from "@/components/minisitio/ui/button";
import { fieldClass } from "@/components/minisitio/ui/field";
import type {
  EgresosGrupos,
  Ingresos,
  getEstadoResultadoTotales,
} from "@/modules/minisitio/infrastructure/queries/financials.queries";
import {
  getEstadoResultadoEgresosGruposAction,
  getEstadoResultadoEgresosOpcionesAction,
  getEstadoResultadoIngresosAction,
  getEstadoResultadoTotalesAction,
  getFinancialYearsAction,
} from "../../_actions/reports";
import { EgresosModal } from "./egresos-modal";

export type EstadoResultadoTotalesResult = Awaited<ReturnType<typeof getEstadoResultadoTotales>>;

/**
 * Totales de las tarjetas. La pantalla vieja leía `result.totales.{totalIngresos, egresos,
 * balance}` (forma de la API anterior a insulae2.0); la consulta actual los devuelve planos.
 */
interface Totales {
  totalIngresos: number;
  egresos: number;
  balance: number;
}

/** Opción (concepto presupuestal) de un grupo de egreso. */
interface OpcionEgreso {
  id: string;
  nombre: string;
  totalAnual: number;
  meses: Record<number, number>;
}

type GrupoEgreso = Omit<EgresosGrupos["grupos"][number], "opciones"> & { opciones: OpcionEgreso[] };
type EgresosState = Omit<EgresosGrupos, "grupos"> & { grupos: GrupoEgreso[] };

interface EstadoResultadoData {
  anio: number;
  totales: Totales;
  ingresos: Ingresos | null;
  egresos: EgresosState | null;
}

interface Balance {
  porMes: Record<number, number>;
  anual: number;
}

/**
 * Carga inicial (servidor). Como en la carga progresiva de antes, cada sección falla por
 * separado: sin totales no hay pantalla; sin ingresos o egresos solo esa tabla muestra su error.
 */
export interface EstadoResultadoInitialData {
  totales: EstadoResultadoTotalesResult;
  ingresos: Ingresos | null;
  egresos: EgresosGrupos | null;
  ingresosError: string | null;
  egresosError: string | null;
}

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const toTotales = (result: EstadoResultadoTotalesResult): Totales => ({
  totalIngresos: result.totalIngresos,
  egresos: result.totalEgresos,
  balance: result.balance,
});

const toEgresosState = (egresos: EgresosGrupos): EgresosState => ({
  ...egresos,
  grupos: egresos.grupos.map((g) => ({ ...g, opciones: g.opciones as OpcionEgreso[] })),
});

// Balance por mes a partir de ingresos y egresos
const calculateBalance = (ingresos: Ingresos | null, egresos: EgresosState | null): Balance => {
  if (!ingresos || !egresos) return { porMes: {}, anual: 0 };

  const balancePorMes: Record<number, number> = {};
  let balanceAnual = 0;

  for (let mes = 1; mes <= 12; mes++) {
    const totalIngresosMes =
      (ingresos.totalesPrincipalesPorMes?.[mes] || 0) +
      (ingresos.totalesOtrosPorMes?.[mes] || 0);
    const totalEgresosMes = egresos.totalesPorMes?.[mes] || 0;

    balancePorMes[mes] = totalIngresosMes - totalEgresosMes;
    balanceAnual += balancePorMes[mes];
  }

  return { porMes: balancePorMes, anual: balanceAnual };
};

const formatCurrency = (amount: number | null | undefined) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export function EstadoResultadoView({
  initialData,
  initialError,
  aniosConDatos = [],
}: {
  initialData: EstadoResultadoInitialData | null;
  initialError: string | null;
  /** Años con movimientos reales (getFinancialYears): se suman a las opciones fijas del selector. */
  aniosConDatos?: number[];
}) {
  // El año sigue viviendo en la URL (?anio=): el selector la actualiza y el cambio recarga los datos.
  const searchParams = useSearchParams();
  const anioParam = searchParams.get("anio");

  const [loading, setLoading] = useState(false);
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [loadingEgresos, setLoadingEgresos] = useState(false);
  const [data, setData] = useState<EstadoResultadoData | null>(() =>
    initialData
      ? {
          anio: initialData.totales.anio,
          totales: toTotales(initialData.totales),
          ingresos: initialData.ingresos,
          egresos: initialData.egresos ? toEgresosState(initialData.egresos) : null,
        }
      : null,
  );
  const [expandedEgresos, setExpandedEgresos] = useState<Record<string, boolean>>({});
  const [loadingOpciones, setLoadingOpciones] = useState<Record<string, boolean>>({});
  const [modalOpcionId, setModalOpcionId] = useState<string | null>(null);
  const [modalOpcionNombre, setModalOpcionNombre] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [apiError, setApiError] = useState<{ message: string; details: string } | null>(
    initialError ? { message: initialError, details: "Error al cargar el estado de resultado" } : null,
  );
  const [ingresosError, setIngresosError] = useState<string | null>(initialData?.ingresosError ?? null);
  const [egresosError, setEgresosError] = useState<string | null>(initialData?.egresosError ?? null);

  // Carga progresiva de datos
  const loadDataProgressively = async (param: string | null) => {
    try {
      // Paso 1: Cargar solo totales (súper rápido)
      const year = await loadTotales(param);

      // Paso 2: Cargar detalles de ingresos
      setLoadingIngresos(true);
      await loadIngresosDetails(year);

      // Paso 3: Cargar grupos de egresos (sin detalles)
      setLoadingEgresos(true);
      await loadEgresosGroups(year);
    } catch (error) {
      console.error("Error en carga progresiva:", error);
      setApiError({
        message: error instanceof Error ? error.message : String(error),
        details: "Error al cargar el estado de resultado",
      });
    } finally {
      setLoading(false);
      setLoadingIngresos(false);
      setLoadingEgresos(false);
    }
  };

  const loadTotales = async (param: string | null) => {
    // Año: el de la URL si viene, o el más reciente con datos reales (desarrollo nuevo)
    let year = parseInt(param ?? "", 10);
    if (!year || Number.isNaN(year)) {
      try {
        const yr = await getFinancialYearsAction();
        year = yr?.latest || new Date().getFullYear();
      } catch {
        year = new Date().getFullYear();
      }
    }

    let result: EstadoResultadoTotalesResult;
    try {
      result = await getEstadoResultadoTotalesAction(year);
    } catch {
      throw new Error("Error al obtener totales");
    }

    // Crear estructura básica con solo totales
    setData({
      anio: result.anio,
      totales: toTotales(result),
      ingresos: null, // Se cargará después
      egresos: null, // Se cargará después
    });

    setLoading(false); // Ya podemos mostrar los totales
    return result.anio;
  };

  const loadIngresosDetails = async (year: number) => {
    try {
      setIngresosError(null);
      const result = await getEstadoResultadoIngresosAction(year);

      setData((prevData) => (prevData ? { ...prevData, ingresos: result.ingresos } : prevData));
    } catch (error) {
      console.error("Error cargando ingresos:", error);
      setIngresosError("Error cargando ingresos");
    } finally {
      setLoadingIngresos(false);
    }
  };

  const retryIngresos = () => {
    setLoadingIngresos(true);
    loadIngresosDetails(data?.anio || new Date().getFullYear());
  };

  const loadEgresosGroups = async (year: number) => {
    try {
      setEgresosError(null);
      const result = await getEstadoResultadoEgresosGruposAction(year);

      setData((prevData) => (prevData ? { ...prevData, egresos: toEgresosState(result.egresos) } : prevData));
    } catch (error) {
      console.error("Error cargando egresos:", error);
      setEgresosError("Error cargando egresos");
    } finally {
      setLoadingEgresos(false);
    }
  };

  const retryEgresos = () => {
    setLoadingEgresos(true);
    loadEgresosGroups(data?.anio || new Date().getFullYear());
  };

  // Al cambiar `?anio=` (selector o atrás/adelante del navegador) se recargan los datos de ese año.
  const anioCargadoRef = useRef(anioParam);
  const onAnioParamChange = useEffectEvent((param: string | null) => {
    loadDataProgressively(param);
  });
  useEffect(() => {
    if (anioCargadoRef.current === anioParam) return;
    anioCargadoRef.current = anioParam;
    onAnioParamChange(anioParam);
  }, [anioParam]);

  const retryLoadData = () => {
    setApiError(null);
    setData(null);
    setLoading(true);
    loadDataProgressively(anioParam);
  };

  const toggleEgreso = async (grupoId: string) => {
    const isCurrentlyExpanded = expandedEgresos[grupoId];

    // Si se está cerrando, solo actualizar el estado
    if (isCurrentlyExpanded) {
      setExpandedEgresos((prev) => ({
        ...prev,
        [grupoId]: false,
      }));
      return;
    }

    // Si se está abriendo, verificar si ya tiene opciones cargadas
    const grupo = data?.egresos?.grupos.find((g) => g.id === grupoId);

    if (!grupo || !data) {
      console.error("Grupo no encontrado:", grupoId);
      return;
    }

    // Si ya tiene opciones cargadas, solo expandir
    if (grupo.opciones && grupo.opciones.length > 0) {
      setExpandedEgresos((prev) => ({
        ...prev,
        [grupoId]: true,
      }));
      return;
    }

    // Si no tiene opciones, cargarlas
    setLoadingOpciones((prev) => ({ ...prev, [grupoId]: true }));

    try {
      const result = await getEstadoResultadoEgresosOpcionesAction(grupoId, data.anio);

      if (result.success) {
        // Actualizar el grupo con las opciones cargadas
        setData((prevData) =>
          prevData && prevData.egresos
            ? {
                ...prevData,
                egresos: {
                  ...prevData.egresos,
                  grupos: prevData.egresos.grupos.map((g) =>
                    g.id === grupoId ? { ...g, opciones: result.opciones as OpcionEgreso[] } : g,
                  ),
                },
              }
            : prevData,
        );

        // Expandir el grupo
        setExpandedEgresos((prev) => ({
          ...prev,
          [grupoId]: true,
        }));
      }
    } catch (error) {
      console.error("Error cargando opciones:", error);
      // Mostrar error pero mantener la UI funcional
    } finally {
      setLoadingOpciones((prev) => ({ ...prev, [grupoId]: false }));
    }
  };

  const openConceptosModal = (opcionId: string, opcionNombre: string) => {
    setModalOpcionId(opcionId);
    setModalOpcionNombre(opcionNombre);
    setShowModal(true);
  };

  const closeModal = () => {
    setModalOpcionId(null);
    setModalOpcionNombre("");
    setShowModal(false);
  };

  // Mostrar skeleton mientras carga
  if (loading && !data) {
    return <FinancialReportSkeleton />;
  }

  // Error sin datos
  if (!data && apiError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4"/>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar datos
          </h2>
          <p className="text-gray-600 mb-4">
            {apiError?.message || "Error desconocido"}
          </p>
          <button
            onClick={retryLoadData}
            className="bg-brand-deep text-white px-6 py-2 rounded-lg hover:bg-gray-800 inline-flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2"/>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Datos mínimos cargados, mostrar la página con skeletons selectivos
  if (!data) {
    return <FinancialReportSkeleton />;
  }

  const { anio, ingresos, egresos, totales } = data;
  // Hasta tener ingresos y egresos, el balance anual es el de los totales (igual que antes).
  const balance: Balance =
    ingresos && egresos ? calculateBalance(ingresos, egresos) : { anual: totales.balance, porMes: {} };

  return (
    <div className="space-y-6">
      {/* Periodo y año; el título ya lo pone el shell. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-stroke-3 pb-3">
        <p className="text-body text-fg-3">Del 1 de enero al 31 de diciembre de {anio}</p>
        <div className="flex items-center gap-2">
          <label htmlFor="er-anio" className="sr-only">
            Año
          </label>
          <select
            id="er-anio"
            value={anio}
            onChange={(e) => {
              const nuevoAnio = e.target.value;
              window.history.pushState(null, "", msPath(`/estado-resultado?anio=${nuevoAnio}`));
            }}
            className={`${fieldClass} h-8 w-auto pr-8`}
          >
            {/* Mismas opciones fijas que el minisitio, más los años con datos y el año mostrado
                (por defecto, el más reciente con ingresos o egresos). */}
            {Array.from(new Set([Number(anio), ...aniosConDatos, 2025, 2024, 2023]))
              .filter((y) => Number.isFinite(y))
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
          <button type="button" onClick={retryLoadData} className={buttonClass("outline", "sm")}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Actualizar
          </button>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Ingresos */}
        <div className="bg-white border border-stroke-2 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-success">
              Total Ingresos
            </h3>
            <TrendingUp className="w-5 h-5 text-success"/>
          </div>
          {totales ? (
            <p className="text-2xl font-bold text-success mt-2">
              {formatCurrency(totales.totalIngresos)}
            </p>
          ) : ingresos ? (
            <p className="text-2xl font-bold text-success mt-2">
              {formatCurrency(ingresos.totalPrincipalesAnual + ingresos.totalOtrosAnual)}
            </p>
          ) : (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mt-2"></div>
            </div>
          )}
          <p className="text-sm text-success mt-1">
            Año {anio}
          </p>
        </div>

        {/* Total Egresos */}
        <div className="bg-white border border-stroke-2 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-overdue">
              Total Egresos
            </h3>
            <TrendingDown className="w-5 h-5 text-overdue"/>
          </div>
          {totales ? (
            <p className="text-2xl font-bold text-overdue mt-2">
              {formatCurrency(totales.egresos)}
            </p>
          ) : egresos ? (
            <p className="text-2xl font-bold text-overdue mt-2">
              {formatCurrency(egresos.totalAnual)}
            </p>
          ) : (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mt-2"></div>
            </div>
          )}
          <p className="text-sm text-overdue mt-1">
            Año {anio}
          </p>
        </div>

        {/* Balance Final */}
        <div className={`bg-white border rounded-lg p-6 shadow-sm ${
          (totales?.balance || balance?.anual || 0) >= 0 ? 'border-stroke-2' : 'border-stroke-2'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${
              (totales?.balance || balance?.anual || 0) >= 0 ? 'text-success' : 'text-overdue'
            }`}>
              Balance Final
            </h3>
            <BarChart3 className={`w-5 h-5 ${
              (totales?.balance || balance?.anual || 0) >= 0 ? 'text-success' : 'text-overdue'
            }`} />
          </div>
          {totales ? (
            <p className={`text-2xl font-bold mt-2 ${
              totales.balance >= 0 ? 'text-success' : 'text-overdue'
            }`}>
              {formatCurrency(totales.balance)}
            </p>
          ) : balance ? (
            <p className={`text-2xl font-bold mt-2 ${
              balance.anual >= 0 ? 'text-success' : 'text-overdue'
            }`}>
              {formatCurrency(balance.anual)}
            </p>
          ) : (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mt-2"></div>
            </div>
          )}
          <p className={`text-sm mt-1 ${
            (totales?.balance || balance?.anual || 0) >= 0 ? 'text-success' : 'text-overdue'
          }`}>
            {(totales?.balance || balance?.anual || 0) >= 0 ? 'Superávit' : 'Déficit'} {anio}
          </p>
        </div>
      </div>

      {/* INGRESOS */}
      <div className="bg-white border border-line shadow-sm overflow-x-auto">
        <div className="bg-surface-2 px-6 py-4 border-b border-stroke-2">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-success mr-2"/>
            <h2 className="text-base font-semibold text-success">
              Ingresos
            </h2>
          </div>
        </div>

        {/* Contenido de Ingresos */}
        {ingresosError ? (
          <div className="p-6 text-center">
            <div className="bg-surface-2 border border-stroke-2 rounded-lg p-4">
              <AlertTriangle className="w-6 h-6 text-overdue mx-auto mb-2"/>
              <h3 className="font-semibold text-overdue">Error cargando ingresos</h3>
              <p className="text-sm text-overdue mb-3">{ingresosError}</p>
              <button
                onClick={retryIngresos}
                className="bg-overdue text-white px-4 py-2 rounded-md hover:bg-red-700 inline-flex items-center text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2"/>
                Reintentar
              </button>
            </div>
          </div>
        ) : loadingIngresos || !ingresos ? (
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="animate-spin w-4 h-4 border-2 border-stroke border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600">Cargando detalles de ingresos...</span>
            </div>
            <TableSkeleton rows={4} cols={14} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand sticky left-0 bg-gray-50 z-10">
                    Concepto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-brand">
                    Anual
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
                {/* Cuotas Ordinarias y Extraordinarias */}
                {ingresos.principales.map((ingreso, idx) => (
                <tr
                  key={ingreso.id}
                  className={idx % 2 === 0 ?"bg-white":"bg-gray-50"}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium sticky left-0 bg-inherit z-10">
                    {ingreso.nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-900">
                    {formatCurrency(ingreso.totalAnual)}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                    <td
                      key={mes}
                      className="px-4 py-3 text-sm text-right tabular-nums text-gray-700"
                    >
                      {formatCurrency(ingreso.meses[mes])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Subtotal Principales */}
              <tr className="bg-surface-2 font-semibold">
                <td className="px-4 py-3 text-sm text-success sticky left-0 bg-surface-2 z-10">
                  Subtotal Ingresos Principales
                </td>
                <td className="px-4 py-3 text-sm text-right tabular-nums font-bold text-success">
                  {formatCurrency(ingresos.totalPrincipalesAnual)}
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                  <td
                    key={mes}
                    className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-success"
                  >
                    {formatCurrency(ingresos.totalesPrincipalesPorMes[mes])}
                  </td>
                ))}
              </tr>

              {/* Otros Ingresos */}
              {ingresos.otros.length > 0 &&
                ingresos.otros.map((ingreso, idx) => (
                  <tr
                    key={ingreso.id}
                    className={idx % 2 === 0 ?"bg-white":"bg-gray-50"}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium sticky left-0 bg-inherit z-10">
                      {ingreso.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-900">
                      {formatCurrency(ingreso.totalAnual)}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                      <td
                        key={mes}
                        className="px-4 py-3 text-sm text-right tabular-nums text-gray-700"
                      >
                        {formatCurrency(ingreso.meses[mes])}
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Subtotal Otros */}
              {ingresos.otros.length > 0 && (
                <tr className="bg-surface-2 font-semibold">
                  <td className="px-4 py-3 text-sm text-success sticky left-0 bg-surface-2 z-10">
                    Subtotal Otros Ingresos
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums font-bold text-success">
                    {formatCurrency(ingresos.totalOtrosAnual)}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                    <td
                      key={mes}
                      className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-success"
                    >
                      {formatCurrency(ingresos.totalesOtrosPorMes[mes])}
                    </td>
                  ))}
                </tr>
              )}

              {/* Total Ingresos */}
              <tr className="bg-surface-2 font-bold border-t-2 border-stroke">
                <td className="px-4 py-4 text-sm text-success sticky left-0 bg-surface-2 z-10">
                  Total Ingresos
                </td>
                <td className="px-4 py-4 text-base text-right tabular-nums font-bold text-success">
                  {formatCurrency(ingresos.totalAnual)}
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => {
                  const totalMes =
                    (ingresos.totalesPrincipalesPorMes[mes] || 0) +
                    (ingresos.totalesOtrosPorMes[mes] || 0);
                  return (
                    <td
                      key={mes}
                      className="px-4 py-4 text-sm text-right tabular-nums font-bold text-success"
                    >
                      {formatCurrency(totalMes)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EGRESOS */}
      <div className="bg-white border border-line shadow-sm">
        <div className="bg-surface-2 px-6 py-4 border-b border-stroke-2">
          <div className="flex items-center">
            <TrendingDown className="w-5 h-5 text-overdue mr-2"/>
            <h2 className="text-base font-semibold text-overdue">
              Egresos
            </h2>
          </div>
        </div>

        {/* Contenido de Egresos */}
        {egresosError ? (
          <div className="p-6 text-center">
            <div className="bg-surface-2 border border-stroke-2 rounded-lg p-4">
              <AlertTriangle className="w-6 h-6 text-overdue mx-auto mb-2"/>
              <h3 className="font-semibold text-overdue">Error cargando egresos</h3>
              <p className="text-sm text-overdue mb-3">{egresosError}</p>
              <button
                onClick={retryEgresos}
                className="bg-overdue text-white px-4 py-2 rounded-md hover:bg-red-700 inline-flex items-center text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2"/>
                Reintentar
              </button>
            </div>
          </div>
        ) : loadingEgresos || !egresos ? (
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="animate-spin w-4 h-4 border-2 border-stroke border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600">Cargando grupos de egresos...</span>
            </div>
            <TableSkeleton rows={5} cols={14} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand sticky left-0 bg-gray-50 z-10">
                    Concepto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-brand">
                    Anual
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
                {egresos.grupos.map((grupo, grupoIdx) => (
                <React.Fragment key={grupo.id}>
                  {/* Grupo Principal */}
                  <tr className="bg-gray-100 hover:bg-gray-150">
                    <td className="px-4 py-3 text-sm text-gray-900 font-bold sticky left-0 bg-gray-100 z-10">
                      <div className="flex items-center">
                        <button
                          className="flex items-center cursor-pointer hover:text-gray-700 transition-colors"
                          onClick={() => toggleEgreso(grupo.id)}
                          disabled={loadingOpciones[grupo.id]}
                        >
                          {loadingOpciones[grupo.id] ? (
                            <div className="animate-spin w-4 h-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                          ) : expandedEgresos[grupo.id] ? (
                            <ChevronDown className="w-4 h-4 mr-2"/>
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-2"/>
                          )}
                          {grupoIdx + 1}. {grupo.nombre}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums font-bold text-gray-900">
                      {formatCurrency(grupo.totalAnual)}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                      <td
                        key={mes}
                        className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-900"
                      >
                        {formatCurrency(grupo.meses[mes])}
                      </td>
                    ))}
                  </tr>

                  {/* Opciones del Grupo (expandidas) */}
                  {expandedEgresos[grupo.id] &&
                    grupo.opciones?.map((opcion, opcionIdx) => (
                      <tr
                        key={opcion.id}
                        className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => openConceptosModal(opcion.id, `${grupo.nombre} - ${opcion.nombre}`)}
                        title="Click para ver conceptos detallados"
                      >
                        <td className="px-4 py-3 text-sm text-gray-800 font-semibold sticky left-0 bg-gray-50 z-10">
                          <div className="flex items-center justify-between pl-6">
                            <div className="flex items-center">
                              <span className="w-6 text-gray-400 mr-2">
                                {String.fromCharCode(97 + opcionIdx)})
                              </span>
                              {opcion.nombre}
                            </div>
                            <div className="flex items-center text-brand text-xs">
                              <Eye className="w-3 h-3 mr-1"/>
                              Ver conceptos
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-gray-800">
                          {formatCurrency(opcion.totalAnual)}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                          (mes) => (
                            <td
                              key={mes}
                              className="px-4 py-3 text-sm text-right tabular-nums text-gray-700"
                            >
                              {formatCurrency(opcion.meses[mes])}
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                </React.Fragment>
              ))}

              {/* Total Egresos */}
              <tr className="bg-surface-2 font-bold border-t-2 border-stroke">
                <td className="px-4 py-4 text-sm text-overdue sticky left-0 bg-surface-2 z-10">
                  Total Egresos
                </td>
                <td className="px-4 py-4 text-base text-right tabular-nums font-bold text-overdue">
                  {formatCurrency(egresos.totalAnual)}
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => (
                  <td
                    key={mes}
                    className="px-4 py-4 text-sm text-right tabular-nums font-bold text-overdue"
                  >
                    {formatCurrency(egresos.totalesPorMes[mes])}
                  </td>
                ))}
              </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BALANCE */}
      <div className="bg-white border border-line shadow-sm overflow-x-auto">
        <div
          className={`px-6 py-4 ${
            (balance?.anual || 0) >= 0 ? "bg-surface-2" : "bg-orange-50"
          }`}
        >
          <div className="flex items-center mb-4">
            <BarChart3
              className={`w-6 h-6 mr-3 ${
                (balance?.anual || 0) >= 0 ? "text-brand" : "text-orange-600"
              }`}
            />
            <span
              className={`text-lg font-bold ${
                (balance?.anual || 0) >= 0 ? "text-brand" : "text-orange-900"
              }`}
            >
              Balance del Periodo
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-canvas">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand sticky left-0 bg-gray-50 z-10">
                  Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-brand">
                  Anual
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
            <tbody>
              <tr
                className={(balance?.anual || 0) >= 0 ?"bg-surface-2":"bg-orange-100"}
              >
                <td
                  className={`px-4 py-4 text-sm font-bold sticky left-0 z-10 ${
                    (balance?.anual || 0) >= 0
                      ? "bg-surface-2 text-brand"
                      : "bg-orange-100 text-orange-900"
                  }`}
                >
                  Balance Final
                </td>
                <td
                  className={`px-4 py-4 text-base text-right tabular-nums font-bold ${
                    (balance?.anual || 0) >= 0 ? "text-brand" : "text-orange-900"
                  }`}
                >
                  {formatCurrency(balance?.anual || 0)}
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => {
                  const balanceMes = balance?.porMes?.[mes] || 0;
                  return (
                    <td
                      key={mes}
                      className={`px-4 py-4 text-sm text-right tabular-nums font-semibold ${
                        balanceMes >= 0 ? "text-brand" : "text-orange-900"
                      }`}
                    >
                      {formatCurrency(balanceMes)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Conceptos Detallados */}
      <EgresosModal
        isOpen={showModal}
        onClose={closeModal}
        opcionId={modalOpcionId}
        opcionNombre={modalOpcionNombre}
        anio={anio}
      />
    </div>
  );
}
