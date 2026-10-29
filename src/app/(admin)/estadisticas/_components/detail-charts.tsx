"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

import type { KpiDetailChart } from "@/modules/statistics";
import {
  CATEGORY_COLORS,
  HorizontalBars,
  OpeningsChart,
  SEQUENTIAL,
  giroColor,
} from "./stats-charts";

const numberFormat = new Intl.NumberFormat("es-MX");
const decimalFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const CATEGORICAL = ["#8a8619", "#0891b2", "#b5451f", "#b8860b", "#2563eb", "#b0509f"];
const SURFACE = "#ffffff";
const BRAND_DEEP = "#5d5b35";
const MUTED = "#e3e1d1";

/**
 * Color de cada porción según el papel que juega:
 * identidad conocida (clasificación / giro), posición en una escala ordenada
 * (sequential), o identidad genérica (category).
 */
function sliceColor(chart: KpiDetailChart, name: string, index: number, total: number): string {
  if (chart.palette === "business") return giroColor(name, index);
  if (chart.palette === "category") {
    return CATEGORY_COLORS[name] ?? CATEGORICAL[index % CATEGORICAL.length];
  }
  if (chart.palette === "sequential") {
    // Con tres o más clases hay escala real (menos → más) y la rampa avanza de
    // claro a oscuro. Con dos no hay orden que mostrar: el primero es el dato
    // protagonista, así que se lleva el tono fuerte y el segundo el apagado.
    if (total <= 2) return index === 0 ? SEQUENTIAL[4] : SEQUENTIAL[0];
    const step = Math.min(SEQUENTIAL.length - 1, Math.round((index / Math.max(1, total - 1)) * (SEQUENTIAL.length - 1)));
    return SEQUENTIAL[step];
  }
  return CATEGORICAL[index % CATEGORICAL.length];
}

function DetailTooltip({
  active,
  payload,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value: number; payload?: { share?: number } }>;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-card border border-line rounded-lg px-3 py-2 shadow-lg text-[12px] pointer-events-none">
      {entry.name && <p className="font-semibold text-ink mb-0.5">{entry.name}</p>}
      <p className="text-ink-soft font-medium tabular-nums">
        {numberFormat.format(entry.value)}
        {suffix ?? ""}
        {entry.payload?.share !== undefined && ` · ${decimalFormat.format(entry.payload.share)}%`}
      </p>
    </div>
  );
}

/** Dona con leyenda tabulada a la derecha */
function DetailDonut({ chart }: { chart: KpiDetailChart }) {
  const total = chart.data.reduce((sum, row) => sum + row.value, 0);
  const rows = chart.data.map((row, index) => ({
    ...row,
    share: total > 0 ? (row.value / total) * 100 : 0,
    color: sliceColor(chart, row.name, index, chart.data.length),
  }));

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[164px] h-[164px] shrink-0">
        <PieChart width={164} height={164}>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx={81}
            cy={81}
            innerRadius={48}
            outerRadius={78}
            paddingAngle={2}
            stroke={SURFACE}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
          </Pie>
          <Tooltip content={<DetailTooltip suffix={chart.suffix} />} />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[21px] font-bold text-ink leading-none">
            {total >= 10000 ? `${Math.round(total / 1000)}k` : numberFormat.format(total)}
          </span>
          {chart.centerLabel && (
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-ink-soft/70 mt-1 px-2 text-center leading-tight">
              {chart.centerLabel}
            </span>
          )}
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-2">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2 text-[11.5px]" title={row.name}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
            <span className="text-ink font-medium flex-1 truncate">{row.name}</span>
            <span className="text-ink font-semibold tabular-nums">{numberFormat.format(row.value)}</span>
            <span className="text-ink-soft/70 tabular-nums w-10 text-right">{decimalFormat.format(row.share)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lista de barras de progreso: para porcentajes, donde el 100% es la referencia */
function DetailProgress({ chart }: { chart: KpiDetailChart }) {
  return (
    <div className="space-y-2.5">
      {chart.data.map((row) => (
        <div key={row.name} className="flex items-center gap-3">
          <span className="text-[11px] text-ink-soft w-[104px] shrink-0 truncate text-right">{row.name}</span>
          <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ backgroundColor: MUTED }}>
            <div
              className="h-full rounded-md"
              style={{ width: `${Math.min(100, row.value)}%`, backgroundColor: BRAND_DEEP }}
            />
          </div>
          <span className="text-[11px] font-semibold text-ink tabular-nums w-[52px] text-right">
            {decimalFormat.format(row.value)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function DetailChart({ chart }: { chart: KpiDetailChart }) {
  if (chart.data.length === 0) {
    return <p className="text-[12px] text-ink-soft">Sin datos para este corte.</p>;
  }
  switch (chart.kind) {
    case "donut":
      return <DetailDonut chart={chart} />;
    case "progress":
      return <DetailProgress chart={chart} />;
    case "columns":
      return <OpeningsChart data={chart.data.map((row) => ({ label: row.name, value: row.value }))} height={220} />;
    default:
      return <HorizontalBars data={chart.data} suffix={chart.suffix ?? ""} labelWidth={chart.wide ? 170 : 138} />;
  }
}
