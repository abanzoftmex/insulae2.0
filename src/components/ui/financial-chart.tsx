"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  month: string;
  ordinaryIncome: number;
  extraordinaryIncome: number;
  otherIncome: number;
  totalIncome: number;
  ordinaryExpenses: number;
  extraordinaryExpenses: number;
  totalExpenses: number;
};

interface FinancialChartProps {
  data: DataPoint[];
}

/* Serie categórica ya validada en /estadisticas: olivo y azul se distinguen por
   tono Y por luminancia, así que sobreviven a daltonismo rojo-verde. No usar
   verde/rojo para ingresos vs egresos por muy "semántico" que suene. */
const INCOME_COLOR = "#8a8619";
const EXPENSE_COLOR = "#2563eb";

/** Eje Y: `$1.2M` / `$450k`. Formatear todo en "k" desbordaba la caja del eje. */
function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
  return `$${abs}`;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-ctrl border border-stroke-2 bg-surface px-3 py-2 text-[12px] shadow-8">
      <p className="mb-1 font-semibold text-fg">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 leading-5 text-fg-2">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ background: entry.color }}
          />
          {entry.name === "ingresos" ? "Ingresos" : "Egresos"}
          <span className="ml-auto pl-3 font-semibold text-fg tabular-nums">
            ${(entry.value as number).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
          </span>
        </p>
      ))}
    </div>
  );
}

const SERIES_FILTERS = [
  { value: "all", label: "Consolidado" },
  { value: "ordinary", label: "Ordinario" },
  { value: "extraordinary", label: "Extraordinario" },
] as const;

export function FinancialChart({ data }: FinancialChartProps) {
  const [filter, setFilter] = useState<"all" | "ordinary" | "extraordinary">("all");

  const filteredData = data.map((d) => {
    let ingresos = d.totalIncome;
    let gastos = d.totalExpenses;

    if (filter === "ordinary") {
      ingresos = d.ordinaryIncome;
      gastos = d.ordinaryExpenses;
    } else if (filter === "extraordinary") {
      ingresos = d.extraordinaryIncome;
      gastos = d.extraordinaryExpenses;
    }

    return {
      month: d.month,
      ingresos,
      gastos,
    };
  });

  return (
    // `h-full` + `flex-1` en el área de trazado: así la gráfica crece hasta
    // llenar la tarjeta cuando el grid la estira para igualar la columna de
    // tickets. Con una altura fija quedaba un hueco blanco de ~200px debajo.
    <div className="flex h-full flex-col gap-4">
      {/* Leyenda + control segmentado. El seleccionado es una superficie blanca
          elevada sobre una pista hundida — el patrón de Fluent, no una píldora
          de marca que compita con los datos. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3">
        <div className="flex items-center gap-4">
          {[
            { color: INCOME_COLOR, label: "Ingresos" },
            { color: EXPENSE_COLOR, label: "Egresos" },
          ].map((serie) => (
            <span key={serie.label} className="flex items-center gap-1.5 text-[12px] text-fg-3">
              <span
                className="h-[3px] w-3.5 rounded-full"
                style={{ background: serie.color }}
              />
              {serie.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-ctrl bg-surface-3 p-0.5">
          {SERIES_FILTERS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`h-6 rounded-[3px] px-2.5 text-[12px] transition-colors ${
                filter === option.value
                  ? "bg-surface font-semibold text-fg shadow-2"
                  : "font-medium text-fg-3 hover:text-fg"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={filteredData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.16} />
              <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.16} />
              <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#616161", fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            width={52}
            tick={{ fontSize: 12, fill: "#616161", fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAxisMoney}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d1d1d1", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="ingresos"
            stroke={INCOME_COLOR}
            strokeWidth={1.75}
            fill="url(#gradIngresos)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: INCOME_COLOR }}
          />
          <Area
            type="monotone"
            dataKey="gastos"
            stroke={EXPENSE_COLOR}
            strokeWidth={1.75}
            fill="url(#gradGastos)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: EXPENSE_COLOR }}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
