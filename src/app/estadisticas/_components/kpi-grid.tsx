"use client";

import { useState } from "react";
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
import { StatCard } from "@/components/ui/stat-card";
import { KpiDetailModal } from "./kpi-detail-modal";

const ICONS: Record<KpiKey, LucideIcon> = {
  owners: Users,
  areas: Building2,
  businesses: Store,
  occupancy: PieChart,
  residential: Home,
  commercial: Landmark,
  land: Building2,
  built: TrendingUp,
};

export interface KpiCardData {
  key: KpiKey;
  label: string;
  value: string;
  hint?: string;
  accent?: "cyan" | "brand" | "lime" | "gold";
}

export function KpiGrid({
  kpis,
  filters,
}: {
  kpis: KpiCardData[];
  filters: { zone: string | null; useType: string | null };
}) {
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = ICONS[kpi.key];
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => setOpenKpi(kpi.key)}
              className="group text-left rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label={`Ver detalle de ${kpi.label}`}
            >
              <StatCard
                label={kpi.label}
                value={kpi.value}
                hint={kpi.hint}
                accent={kpi.accent}
                icon={<Icon className="w-4 h-4" />}
                className="h-full cursor-pointer transition-standard group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.98]"
              />
            </button>
          );
        })}
      </div>

      {openKpi && <KpiDetailModal kpiKey={openKpi} filters={filters} onClose={() => setOpenKpi(null)} />}
    </>
  );
}
