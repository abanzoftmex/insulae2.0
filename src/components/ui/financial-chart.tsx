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
            ${(entry.value as number).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>
      ))}
    </div>
  );
}

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
    <div className="space-y-4">
      {/* Control Tabs */}
      <div className="flex items-center justify-end gap-1.5 px-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md border border-line/30 transition-all ${
            filter === "all"
              ? "bg-brand-deep text-white shadow-sm border-brand"
              : "text-ink-soft/60 hover:text-ink hover:bg-canvas/50"
          }`}
        >
          Consolidado
        </button>
        <button
          onClick={() => setFilter("ordinary")}
          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md border border-line/30 transition-all ${
            filter === "ordinary"
              ? "bg-brand-deep text-white shadow-sm border-brand"
              : "text-ink-soft/60 hover:text-ink hover:bg-canvas/50"
          }`}
        >
          Ordinario
        </button>
        <button
          onClick={() => setFilter("extraordinary")}
          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md border border-line/30 transition-all ${
            filter === "extraordinary"
              ? "bg-brand-deep text-white shadow-sm border-brand"
              : "text-ink-soft/60 hover:text-ink hover:bg-canvas/50"
          }`}
        >
          Extraordinario
        </button>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00754A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00754A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
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
            stroke="#1d4ed8"
            strokeWidth={1.5}
            fill="url(#gradGastos)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#1d4ed8" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
