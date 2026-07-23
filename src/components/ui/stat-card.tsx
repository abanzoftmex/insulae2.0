import * as React from "react";
import { cn } from "@/shared/utils/cn";
import { Card } from "./card";

type StatCardAccent = "cyan" | "brand" | "lime" | "gold" | "emerald";

const accentMap: Record<StatCardAccent, { card: string; icon: string; label: string; value: string }> = {
  cyan: {
    card: "bg-canvas border-line/40",
    icon: "bg-cyan-950 text-cyan-200",
    label: "text-ink-soft/75",
    value: "text-ink",
  },
  brand: {
    card: "bg-canvas border-line/40",
    icon: "bg-brand-deep text-brand-mint",
    label: "text-ink-soft/75",
    value: "text-ink",
  },
  lime: {
    card: "bg-canvas border-line/40",
    icon: "bg-lime-900 text-lime-200",
    label: "text-ink-soft/75",
    value: "text-ink",
  },
  gold: {
    card: "bg-canvas border-line/40",
    icon: "bg-amber-900 text-amber-200",
    label: "text-ink-soft/75",
    value: "text-ink",
  },
  emerald: {
    card: "bg-canvas border-line/40",
    icon: "bg-emerald-900 text-emerald-100",
    label: "text-ink-soft/75",
    value: "text-ink",
  },
};

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isUp: boolean;
  };
  /** Texto informativo sin flecha de tendencia */
  hint?: string;
  icon?: React.ReactNode;
  accent?: StatCardAccent;
}

export function StatCard({ label, value, trend, hint, icon, accent, className, ...props }: StatCardProps) {
  const colors = accent ? accentMap[accent] : null;

  return (
    <Card className={cn("p-3.5 sm:p-4 flex flex-col justify-between min-h-24 shadow-sm bg-canvas border-line/40", colors?.card, className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[10px] font-bold uppercase tracking-wider text-ink-soft/75", colors?.label)}>
          {label}
        </p>
        {icon && (
          <div className={cn("p-1.5 rounded-md shrink-0", colors ? colors.icon : "text-brand-accent/40 bg-canvas")}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <h3 className={cn("text-lg sm:text-xl font-bold leading-tight tracking-tight text-ink", colors?.value)}>
          {value}
        </h3>
        {trend && (
          <span className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0",
            trend.isUp
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          )}>
            {trend.isUp ? "↑" : "↓"} {trend.value}
          </span>
        )}
        {hint && !trend && (
          <span className="text-[10px] font-semibold text-ink-soft/70 text-right leading-tight max-w-[58%]">
            {hint}
          </span>
        )}
      </div>
    </Card>
  );
}
