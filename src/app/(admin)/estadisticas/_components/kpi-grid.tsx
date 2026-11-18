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
  brand: { card: "#e8eef1", icon: "#304854", label: "#52525b", value: "#000000" },
  cyan: { card: "#f0fbfd", icon: "#083344", label: "#52525b", value: "#09090b" },
  gold: { card: "#faf8f3", icon: "#d0b685", label: "#52525b", value: "#000000" },
  lime: { card: "#f2faf4", icon: "#14532d", label: "#52525b", value: "#09090b" },
  plain: { card: "#ffffff", icon: "#6b7280", label: "#52525b", value: "#09090b" },
};

export interface KpiCardData {
  key: KpiKey;
  label: string;
  value: string;
  hint?: string;
  accent?: Accent;
  colSpan?: number;
  secondary?: {
    key: KpiKey;
    label: string;
    value: string;
    hint?: string;
  };
}

export function KpiGrid({
  kpis,
  filters,
}: {
  kpis: KpiCardData[];
  filters: { zone: string | null; useType: string | null };
}) {
  const [openTarget, setOpenTarget] = useState<{ kpi: KpiCardData; initialTab?: KpiKey } | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = KPI_ICONS[kpi.key];
          const tone = ACCENT_STYLES[kpi.accent ?? "plain"];
          const isOpen = openTarget?.kpi.key === kpi.key;

          if (kpi.secondary) {
            const SecondaryIcon = KPI_ICONS[kpi.secondary.key] ?? Landmark;
            return (
              <motion.div
                key={kpi.key}
                layoutId={reduceMotion ? undefined : `kpi-shell-${kpi.key}`}
                style={{ borderRadius: 12, backgroundColor: tone.card }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
                className={cn(
                  "col-span-2 text-left p-4 min-h-25 flex flex-col justify-between border shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden group",
                  "focus-within:ring-2 focus-within:ring-brand/40",
                  kpi.accent ? "border-amber-900/15" : "border-line/80",
                  isOpen && "invisible",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: tone.label }}
                    >
                      {kpi.label}
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 border border-amber-300/60">
                      Comercio y Servicios
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="p-1.5 rounded-md shrink-0 shadow-sm"
                      style={{ backgroundColor: tone.icon }}
                      title="Negocios activos"
                    >
                      <Icon className="w-4 h-4" style={{ color: tone.card }} />
                    </span>
                    <span
                      className="p-1.5 rounded-md shrink-0 bg-[#304854] shadow-sm"
                      title="Locales y servicios"
                    >
                      <SecondaryIcon className="w-4 h-4 text-white" />
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 mt-2 border-t border-amber-900/10">
                  <button
                    type="button"
                    onClick={() => setOpenTarget({ kpi, initialTab: kpi.key })}
                    className="text-left p-1.5 -m-1.5 rounded-lg hover:bg-black/[0.03] transition-colors focus:outline-none"
                    title="Ver detalle de Negocios activos"
                  >
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                      Negocios activos
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span
                        className="text-2xl font-bold leading-none tracking-tight group-hover:scale-105 transition-transform"
                        style={{ color: tone.value }}
                      >
                        {kpi.value}
                      </span>
                      {kpi.hint && (
                        <span className="text-[10px] font-semibold text-ink-soft/75">
                          {kpi.hint}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenTarget({ kpi, initialTab: kpi.secondary?.key })}
                    className="text-left border-l border-amber-900/15 pl-3 p-1.5 -m-1.5 rounded-lg hover:bg-black/[0.03] transition-colors focus:outline-none"
                    title="Ver detalle de Locales y servicios"
                  >
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 inline-block" />
                      {kpi.secondary.label}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold leading-none tracking-tight text-ink group-hover:scale-105 transition-transform">
                        {kpi.secondary.value}
                      </span>
                      {kpi.secondary.hint && (
                        <span className="text-[10px] font-semibold text-ink-soft/75">
                          {kpi.secondary.hint}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.button
              key={kpi.key}
              type="button"
              onClick={() => setOpenTarget({ kpi })}
              layoutId={reduceMotion ? undefined : `kpi-shell-${kpi.key}`}
              style={{ borderRadius: 12, backgroundColor: tone.card }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className={cn(
                "text-left p-4 min-h-25 flex flex-col justify-between border shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                kpi.accent ? "border-black/[0.06]" : "border-line/80",
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
        {openTarget && (
          <KpiDetailModal
            key={openTarget.kpi.key}
            kpi={openTarget.kpi}
            initialTab={openTarget.initialTab}
            filters={filters}
            onClose={() => setOpenTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
