import React from "react";
import {
  Building2,
  Home,
  Landmark,
  PieChart,
  Store,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { KpiKey } from "@/modules/statistics";
import { cn } from "@/shared/utils/cn";

const KPI_ICONS: Record<KpiKey, LucideIcon> = {
  owners: Users,
  areas: Building2,
  businesses: Store,
  occupancy: PieChart,
  residential: Home,
  commercial: Landmark,
  land: Building2,
  built: TrendingUp,
};

type Accent = "cyan" | "brand" | "lime" | "gold" | "plain";

const ACCENT_STYLES: Record<Accent, { card: string; iconBg: string; iconColor: string; label: string; border: string }> = {
  brand: { card: "#edf4f7", iconBg: "#304854", iconColor: "#ffffff", label: "#304854", border: "rgba(48,72,84,0.18)" },
  cyan: { card: "#f0fbfd", iconBg: "#0891b2", iconColor: "#ffffff", label: "#0e7490", border: "rgba(8,145,178,0.2)" },
  gold: { card: "#faf8f3", iconBg: "#d0b685", iconColor: "#1f2937", label: "#8a6e3e", border: "rgba(208,182,133,0.3)" },
  lime: { card: "#f7fbec", iconBg: "#4d7c0f", iconColor: "#ffffff", label: "#3f6212", border: "rgba(77,124,15,0.2)" },
  plain: { card: "#ffffff", iconBg: "#f3f4f6", iconColor: "#304854", label: "#6b7280", border: "rgba(0,0,0,0.08)" },
};

export interface PrintKpiItem {
  key: KpiKey;
  label: string;
  value: string;
  hint?: string;
  accent?: Accent;
}

export function PrintKpiGrid({ kpis }: { kpis: PrintKpiItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {kpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.key];
        const tone = ACCENT_STYLES[kpi.accent ?? "plain"];

        return (
          <div
            key={kpi.key}
            style={{
              backgroundColor: tone.card,
              borderColor: tone.border,
            }}
            className="p-3 rounded-lg border flex flex-col justify-between min-h-[82px] shadow-sm avoid-break"
          >
            <div className="flex items-start justify-between gap-1.5">
              <span
                style={{ color: tone.label }}
                className="text-[9px] font-extrabold uppercase tracking-wider leading-tight"
              >
                {kpi.label}
              </span>
              <span
                style={{ backgroundColor: tone.iconBg, color: tone.iconColor }}
                className="p-1 rounded shrink-0"
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="mt-1">
              <p className="text-[20px] font-extrabold text-[#000000] leading-none tabular-nums tracking-tight">
                {kpi.value}
              </p>
              {kpi.hint && (
                <p className="text-[9.5px] text-[#4b5563] mt-1 font-medium leading-tight">
                  {kpi.hint}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

