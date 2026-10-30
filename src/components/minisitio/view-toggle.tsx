"use client";

/**
 * Selector Tabla / Tarjetas. La pastilla blanca se desliza a la opción elegida (layoutId) y
 * con "reducir movimiento" cambia sin desplazarse.
 */
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutGrid, List } from "lucide-react";
import type { ListView } from "@/stores/minisitio.store";

const OPTIONS: { value: ListView; label: string; icon: typeof List }[] = [
  { value: "table", label: "Tabla", icon: List },
  { value: "grid", label: "Tarjetas", icon: LayoutGrid },
];

export function ViewToggle({
  view,
  onViewChange,
  className = "",
}: {
  view: ListView;
  onViewChange: (view: ListView) => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pillId = useId();

  return (
    <div role="group" aria-label="Vista" className={`flex items-center rounded-[10px] bg-surface-4 p-1 ring-1 ring-inset ring-stroke-3 ${className}`}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onViewChange(value)}
            aria-pressed={active}
            className={`relative flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/45 ${
              active ? "text-brand-deep" : "text-fg-3 hover:text-fg"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                aria-hidden
                className="absolute inset-0 bg-card"
                style={{ borderRadius: 6, boxShadow: "0 1px 2px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.04)" }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42, mass: 0.9 }}
              />
            )}
            <Icon aria-hidden className="relative h-4 w-4" strokeWidth={active ? 2 : 1.75} />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
