"use client";

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
  ingresos: number;
  gastos: number;
};

interface FinancialChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-line rounded-lg px-3 py-2 shadow-md text-[12px]">
      <p className="font-semibold text-ink mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name === "ingresos" ? "Ingresos" : "Gastos"}:{" "}
          <span className="tabular-nums">
            ${(entry.value as number).toLocaleString("es-MX")}
          </span>
        </p>
      ))}
    </div>
  );
}

export function FinancialChart({ data }: FinancialChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00754A" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#00754A" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c82014" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#c82014" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)", fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)", fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,0,0,0.08)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="ingresos"
          stroke="#00754A"
          strokeWidth={1.5}
          fill="url(#gradIngresos)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#00754A" }}
        />
        <Area
          type="monotone"
          dataKey="gastos"
          stroke="#c82014"
          strokeWidth={1.5}
          fill="url(#gradGastos)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "#c82014" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
