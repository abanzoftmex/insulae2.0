"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

// ─── Sistema de color ─────────────────────────────────────────────────────────
// Categórica (identidad, orden fijo por giro, nunca ciclada) y rampa secuencial
// (magnitud, un solo tono oliva light→dark). Ambas validadas: la categórica pasa
// los seis checks de CVD y la rampa las cuatro comprobaciones ordinales.

export const GIRO_COLORS: Record<string, string> = {
  "Alimento & Bebidas": "#8a8619",
  Educación: "#0891b2",
  Experiencia: "#b5451f",
  Hospedaje: "#b8860b",
  Servicios: "#2563eb",
  Tiendas: "#b0509f",
};
const CATEGORICAL_ORDER = ["#8a8619", "#0891b2", "#b5451f", "#b8860b", "#2563eb", "#b0509f"];

/** Rampa secuencial oliva: light→dark, contraste del extremo claro 2.27:1 */
export const SEQUENTIAL = ["#a9af6b", "#949a52", "#7f853f", "#6a7031", "#555a24", "#3f4319"];

/** Clasificación de inmueble: identidad estable, no ranking */
export const CATEGORY_COLORS: Record<string, string> = {
  Habitacional: "#8a8619",
  "Comercial / Servicios": "#0891b2",
  "Lote / Suelo": "#b8860b",
  "Sin clasificar": "#9ca3af",
};

const BRAND = "#757242";
const BRAND_DEEP = "#5d5b35";
const MUTED = "#c9cbb4";
const GRID = "rgba(0,0,0,0.06)";
const INK_SOFT = "rgba(0,0,0,0.58)";
const SURFACE = "#ffffff";

export function giroColor(name: string, index: number): string {
  return GIRO_COLORS[name] ?? CATEGORICAL_ORDER[index % CATEGORICAL_ORDER.length];
}

/**
 * Paso de la rampa para un valor dentro de [0, max].
 * Los conteos del condominio están muy sesgados (Centro concentra ~20x el resto),
 * así que una escala lineal dejaría todo lo demás en el mismo tono claro; la raíz
 * cuadrada reparte los pasos de forma perceptualmente útil.
 */
export function rampStep(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "#eef0e4";
  const ratio = Math.sqrt(value / max);
  const index = Math.min(SEQUENTIAL.length - 1, Math.floor(ratio * SEQUENTIAL.length));
  return SEQUENTIAL[index];
}

const numberFormat = new Intl.NumberFormat("es-MX");
const decimalFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

// ─── Tooltip común ────────────────────────────────────────────────────────────

function TooltipShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-lg px-3 py-2 shadow-lg text-[12px] pointer-events-none">
      {title && <p className="font-semibold text-ink mb-0.5">{title}</p>}
      <div className="text-ink-soft font-medium tabular-nums">{children}</div>
    </div>
  );
}

function SimpleTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload?: Record<string, unknown> }>;
  label?: string;
  format?: (value: number, row?: Record<string, unknown>) => string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <TooltipShell title={label}>
      {format ? format(entry.value, entry.payload) : numberFormat.format(entry.value)}
    </TooltipShell>
  );
}

interface NameValue {
  name: string;
  value: number;
}

// ─── Barras horizontales (ranking / magnitud, una sola serie) ─────────────────

export function HorizontalBars({
  data,
  height,
  color = BRAND,
  suffix = "",
  labelWidth = 168,
  /** Colorea cada barra con su identidad en lugar del tono único de serie */
  colorByName,
  /** Aplica la rampa secuencial según la magnitud (solo para escalas ordenadas) */
  useRamp = false,
}: {
  data: NameValue[];
  height?: number;
  color?: string;
  suffix?: string;
  labelWidth?: number;
  colorByName?: Record<string, string>;
  useRamp?: boolean;
}) {
  const chartHeight = height ?? Math.max(110, data.length * 32 + 16);
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 4 }} barCategoryGap="26%">
        <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_SOFT, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          content={<SimpleTooltip format={(v) => `${numberFormat.format(v)}${suffix}`} />}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={colorByName?.[entry.name] ?? (useRamp ? rampStep(entry.value, max) : color)}
            />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: unknown) => `${numberFormat.format(Number(v ?? 0))}${suffix}`}
            style={{ fill: INK_SOFT, fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Dona de participación (part-to-whole, ≤ 6 segmentos) ─────────────────────

export function BusinessLineDonut({
  data,
  total,
}: {
  data: { name: string; businesses: number; share: number }[];
  total: number;
}) {
  const chartData = data.map((row) => ({ name: row.name, value: row.businesses, share: row.share }));
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* Tamaño fijo: ResponsiveContainer no resuelve altura dentro de un flex
          y colapsaba la dona a unos pocos píxeles. */}
      <div className="relative w-[200px] h-[200px] shrink-0">
        <PieChart width={200} height={200}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx={99}
            cy={99}
            innerRadius={58}
            outerRadius={92}
            paddingAngle={2}
            stroke={SURFACE}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={giroColor(entry.name, index)} />
            ))}
          </Pie>
          <Tooltip
            content={
              <SimpleTooltip
                format={(v, row) =>
                  `${numberFormat.format(v)} negocios · ${decimalFormat.format((row?.share as number) ?? 0)}%`
                }
              />
            }
          />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-bold text-ink leading-none">{numberFormat.format(total)}</span>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft/70 mt-1">clasificados</span>
        </div>
      </div>
      <ul className="flex-1 w-full space-y-2">
        {chartData.map((entry, index) => (
          <li key={entry.name}>
            <div className="flex items-center gap-2 text-[12px] mb-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: giroColor(entry.name, index) }}
              />
              <span className="text-ink font-medium flex-1 truncate">{entry.name}</span>
              <span className="text-ink tabular-nums font-semibold">{numberFormat.format(entry.value)}</span>
              <span className="text-ink-soft/70 tabular-nums w-11 text-right">
                {decimalFormat.format(entry.share)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-canvas-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${entry.share}%`, backgroundColor: giroColor(entry.name, index) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Anillo de composición (clasificación de inmuebles) ───────────────────────

export function CompositionDonut({ data, totalLabel }: { data: NameValue[]; totalLabel: string }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[168px] h-[168px] shrink-0">
        <PieChart width={168} height={168}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx={83}
            cy={83}
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            stroke={SURFACE}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? CATEGORICAL_ORDER[index]} />
            ))}
          </Pie>
          <Tooltip
            content={
              <SimpleTooltip
                format={(v) => `${numberFormat.format(v)} · ${decimalFormat.format((v / total) * 100)}%`}
              />
            }
          />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[24px] font-bold text-ink leading-none">{numberFormat.format(total)}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft/70 mt-1">{totalLabel}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2.5">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-baseline gap-2 text-[12px]">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 translate-y-px"
              style={{ backgroundColor: CATEGORY_COLORS[entry.name] ?? CATEGORICAL_ORDER[index] }}
            />
            <span className="text-ink font-medium flex-1">{entry.name}</span>
            <span className="text-ink font-bold tabular-nums">{numberFormat.format(entry.value)}</span>
            <span className="text-ink-soft/70 tabular-nums text-[11px] w-11 text-right">
              {decimalFormat.format((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Treemap de composición (muchas categorías, magnitud relativa) ────────────

interface TreemapNode {
  name?: string;
  size?: number;
  category?: string;
  index?: number;
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  root?: { children?: { size: number }[] };
}

function TreemapCell(props: TreemapNode) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", size = 0, category } = props;
  // El área ya codifica la cantidad; el color se reserva para la clasificación,
  // así el treemap informa dos dimensiones en lugar de repetir una.
  const fill = CATEGORY_COLORS[category ?? ""] ?? BRAND;
  // Sólo se etiqueta cuando el texto cabe completo: se calcula cuántos
  // caracteres entran en el ancho real del rectángulo (~5.6px por carácter a 11px)
  const padding = 16;
  const maxChars = Math.floor((width - padding) / 5.6);
  const showLabel = width > 70 && height > 34 && maxChars >= 6;
  const showValue = width > 70 && height > 52;
  const short = name.length > maxChars ? `${name.slice(0, Math.max(3, maxChars - 1))}…` : name;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke={SURFACE} strokeWidth={2} rx={3} />
      {showLabel && (
        <text x={x + 8} y={y + 18} fontSize={11} fontWeight={600} fill="#ffffff">
          {short}
        </text>
      )}
      {showValue && (
        <text x={x + 8} y={y + 35} fontSize={13} fontWeight={700} fill="rgba(255,255,255,0.88)">
          {numberFormat.format(size)}
        </text>
      )}
    </g>
  );
}

export function UseTypeTreemap({
  data,
  height = 260,
}: {
  data: { name: string; value: number; category: string }[];
  height?: number;
}) {
  const treeData = data.map((row) => ({ name: row.name, size: row.value, category: row.category }));
  const legend = [...new Set(data.map((row) => row.category))];
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={treeData}
          dataKey="size"
          nameKey="name"
          stroke={SURFACE}
          isAnimationActive={false}
          content={<TreemapCell />}
        >
          <Tooltip content={<SimpleTooltip format={(v) => `${numberFormat.format(v)} inmuebles`} />} />
        </Treemap>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
        {legend.map((category) => (
          <span key={category} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: CATEGORY_COLORS[category] ?? BRAND }}
            />
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Matriz de calor barrio × clasificación ───────────────────────────────────

export function ZoneCategoryHeatmap({
  rows,
  categories,
}: {
  rows: { zone: string; total: number; counts: Record<string, number> }[];
  categories: string[];
}) {
  const max = Math.max(...rows.flatMap((row) => categories.map((c) => row.counts[c] ?? 0)), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate" style={{ borderSpacing: "2px" }}>
        <thead>
          <tr>
            <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 pb-1.5 pr-2 w-[120px]">
              Barrio
            </th>
            {categories.map((category) => (
              <th
                key={category}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 pb-1.5 px-1"
              >
                {category.replace(" / Servicios", "").replace(" / Suelo", "")}
              </th>
            ))}
            <th className="text-right text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 pb-1.5 pl-2 w-[52px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.zone}>
              <td className="text-[11.5px] text-ink font-medium pr-2 whitespace-nowrap">{row.zone}</td>
              {categories.map((category) => {
                const value = row.counts[category] ?? 0;
                const fill = value > 0 ? rampStep(value, max) : "transparent";
                const dark = SEQUENTIAL.indexOf(fill) >= 3;
                return (
                  <td key={category} className="p-0">
                    <div
                      className="h-8 rounded-md flex items-center justify-center text-[11.5px] font-semibold tabular-nums transition-standard hover:brightness-95"
                      style={{
                        backgroundColor: fill,
                        color: value === 0 ? "rgba(0,0,0,0.22)" : dark ? "#ffffff" : "rgba(0,0,0,0.75)",
                        border: value === 0 ? "1px dashed rgba(0,0,0,0.08)" : "none",
                      }}
                      title={`${row.zone} · ${category}: ${numberFormat.format(value)} inmuebles`}
                    >
                      {value === 0 ? "—" : numberFormat.format(value)}
                    </div>
                  </td>
                );
              })}
              <td className="text-[11.5px] text-ink font-bold tabular-nums text-right pl-2">
                {numberFormat.format(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-3 pl-[120px]">
        <span className="text-[10px] text-ink-soft/70 font-medium">Menos</span>
        <div className="flex gap-0.5">
          {SEQUENTIAL.map((step) => (
            <span key={step} className="w-6 h-2.5 rounded-sm" style={{ backgroundColor: step }} />
          ))}
        </div>
        <span className="text-[10px] text-ink-soft/70 font-medium">Más inmuebles</span>
      </div>
    </div>
  );
}

// ─── Barra apilada de ocupación por barrio (part-to-whole) ────────────────────

export function OccupancyStackedBars({
  rows,
}: {
  rows: { zone: string; occupied: number; vacant: number; total: number; rate: number }[];
}) {
  // Cada barra usa el ancho completo: lo que se compara es la proporción
  // ocupada, no el tamaño del barrio (ese dato va en la etiqueta de la derecha).
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-4 text-[11px] mb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BRAND_DEEP }} />
          <span className="text-ink-soft">Ocupados</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: MUTED }} />
          <span className="text-ink-soft">Sin ocupar</span>
        </span>
      </div>
      {rows.map((row) => (
        <div key={row.zone} className="flex items-center gap-3 group">
          <span className="text-[11px] text-ink-soft w-[104px] shrink-0 truncate text-right">{row.zone}</span>
          <div
            className="flex-1 flex gap-[2px] h-5 items-center"
            title={`${row.zone}: ${numberFormat.format(row.occupied)} ocupados de ${numberFormat.format(row.total)} (${decimalFormat.format(row.rate)}%)`}
          >
            <div
              className="h-full rounded-l-[3px] transition-standard group-hover:brightness-110"
              style={{
                width: `${row.rate}%`,
                backgroundColor: BRAND_DEEP,
                borderTopRightRadius: row.vacant === 0 ? 3 : 1,
                borderBottomRightRadius: row.vacant === 0 ? 3 : 1,
              }}
            />
            {row.vacant > 0 && (
              <div
                className="h-full rounded-r-[3px]"
                style={{ width: `${100 - row.rate}%`, backgroundColor: MUTED, minWidth: 3 }}
              />
            )}
          </div>
          <span className="text-[11px] font-semibold text-ink tabular-nums w-[46px] text-right">
            {decimalFormat.format(row.rate)}%
          </span>
          <span className="text-[10.5px] text-ink-soft/70 tabular-nums w-[68px] text-right">
            {numberFormat.format(row.occupied)}/{numberFormat.format(row.total)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Columnas: aperturas por año ──────────────────────────────────────────────

export function OpeningsChart({ data, height = 210 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: INK_SOFT, fontSize: 11 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_SOFT, fontSize: 11 }}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          content={<SimpleTooltip format={(v) => `${numberFormat.format(v)} aperturas`} />}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((entry) => (
            // El año pico se destaca; el resto queda en el tono recesivo
            <Cell key={entry.label} fill={entry.value === max ? BRAND_DEEP : "#b6b894"} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: unknown) => numberFormat.format(Number(v ?? 0))}
            style={{ fill: INK_SOFT, fontSize: 10, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Área: cobranza mensual ───────────────────────────────────────────────────

export function PaymentsChart({ data }: { data: { label: string; count: number; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="paymentsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: INK_SOFT, fontSize: 10 }} interval={2} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_SOFT, fontSize: 10 }}
          width={48}
          tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`)}
        />
        <Tooltip
          content={
            <SimpleTooltip
              format={(v, row) =>
                `$${numberFormat.format(Math.round(v))} MXN · ${numberFormat.format((row?.count as number) ?? 0)} pagos`
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#paymentsFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Medidor de ocupación ─────────────────────────────────────────────────────

export function OccupancyMeter({
  rate,
  occupied,
  unoccupied,
}: {
  rate: number;
  occupied: number;
  unoccupied: number;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[34px] font-bold text-ink leading-none tracking-tight">
            {decimalFormat.format(rate)}%
          </span>
          <span className="text-[11px] text-ink-soft font-medium">ocupación</span>
        </div>
        <span className="text-[11px] text-ink-soft text-right">
          {numberFormat.format(occupied)} ocupados
          <br />
          {numberFormat.format(unoccupied)} sin ocupar
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: MUTED }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, rate))}%`, backgroundColor: BRAND_DEEP }}
        />
      </div>
    </div>
  );
}

// ─── Mini-barras para tarjetas KPI ────────────────────────────────────────────

export function MiniBars({ data, color = BRAND }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-6" aria-hidden>
      {data.map((value, index) => (
        <span
          key={index}
          className="flex-1 rounded-t-[2px] min-h-[2px]"
          style={{ height: `${Math.max(8, (value / max) * 100)}%`, backgroundColor: color, opacity: 0.25 + (index / data.length) * 0.75 }}
        />
      ))}
    </div>
  );
}

/** Barra de proporción simple para tarjetas compactas */
export function ShareBar({ value, total, color = BRAND }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-canvas-2 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
