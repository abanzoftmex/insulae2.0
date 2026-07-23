"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { KpiDetailModal } from "./kpi-detail-modal";

export const KPI_ICONS: Record<KpiKey, LucideIcon> = {
  owners: Users,
  areas: Building2,
  businesses: Store,
  occupancy: PieChart,
  residential: Home,
  commercial: Landmark,
  land: Building2,
  built: TrendingUp,
};

type Accent = "cyan" | "brand" | "lime" | "gold";

/** Tonos por acento: los mismos que usa StatCard, aquí como valores para poder animarlos */
export const ACCENT_STYLES: Record<Accent | "plain", { card: string; icon: string; label: string; value: string }> = {
  brand: { card: "#f7f7f1", icon: "#3d3c22", label: "#52525b", value: "#09090b" },
  cyan: { card: "#f0fbfd", icon: "#083344", label: "#52525b", value: "#09090b" },
  gold: { card: "#fbf8f0", icon: "#78350f", label: "#52525b", value: "#09090b" },
  lime: { card: "#f7fbec", icon: "#365314", label: "#52525b", value: "#09090b" },
  plain: { card: "#ffffff", icon: "#6b7280", label: "#52525b", value: "#09090b" },
};

export interface KpiCardData {
  key: KpiKey;
  label: string;
  value: string;
  hint?: string;
  accent?: Accent;
}

export function KpiGrid({
  kpis,
  filters,
}: {
  kpis: KpiCardData[];
  filters: { zone: string | null; useType: string | null };
}) {
  const [openKpi, setOpenKpi] = useState<KpiCardData | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = KPI_ICONS[kpi.key];
          const tone = ACCENT_STYLES[kpi.accent ?? "plain"];
          const isOpen = openKpi?.key === kpi.key;
          return (
            <motion.button
              key={kpi.key}
              type="button"
              onClick={() => setOpenKpi(kpi)}
              // El contenedor comparte layoutId con el panel: al abrir, esta
              // misma superficie se expande hasta ocupar la pantalla.
              layoutId={reduceMotion ? undefined : `kpi-shell-${kpi.key}`}
              style={{ borderRadius: 12, backgroundColor: tone.card }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className={cn(
                "text-left p-4 min-h-25 flex flex-col justify-between border shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                kpi.accent ? "border-black/[0.06]" : "border-line/80",
                // Mientras el detalle está abierto la tarjeta cede su lugar al panel
                isOpen && "invisible",
              )}
              aria-label={`Ver detalle de ${kpi.label}`}
            >
              <div className="flex items-start justify-between gap-2">
                <motion.p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: tone.label }}
                >
                  {kpi.label}
                </motion.p>
                <motion.span
                  className="p-1.5 rounded-md shrink-0"
                  style={{ backgroundColor: tone.icon }}
                >
                  <Icon className="w-4 h-4" style={{ color: tone.card }} />
                </motion.span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <motion.span
                  className="text-xl font-bold leading-none"
                  style={{ color: tone.value }}
                >
                  {kpi.value}
                </motion.span>
                {kpi.hint && (
                  <span className="text-[10px] font-semibold text-ink-soft/70 text-right leading-tight max-w-[58%]">
                    {kpi.hint}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {openKpi && (
          <KpiDetailModal
            key={openKpi.key}
            kpi={openKpi}
            filters={filters}
            onClose={() => setOpenKpi(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
