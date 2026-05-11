import * as React from "react";
import { cn } from "@/shared/utils/cn";
import { Card } from "./card";

type StatCardAccent = "cyan" | "brand" | "lime" | "gold";

const accentMap: Record<StatCardAccent, { card: string; icon: string; label: string; value: string }> = {
  cyan: {
    card: "bg-cyan-50/70 border-cyan-200/60",
    icon: "bg-cyan-950 text-cyan-200",
    label: "text-cyan-600",
    value: "text-cyan-700",
  },
  brand: {
    card: "bg-brand/5 border-brand/20",
    icon: "bg-brand-deep text-brand-mint",
    label: "text-brand",
    value: "text-brand",
  },
  lime: {
    card: "bg-lime-50/70 border-lime-200/60",
    icon: "bg-lime-900 text-lime-200",
    label: "text-lime-700",
    value: "text-lime-700",
  },
  gold: {
    card: "bg-gold-soft border-gold/30",
    icon: "bg-amber-900 text-amber-200",
    label: "text-amber-600",
    value: "text-amber-700",
  },
};

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isUp: boolean;
  };
  icon?: React.ReactNode;
  accent?: StatCardAccent;
}

export function StatCard({ label, value, trend, icon, accent, className, ...props }: StatCardProps) {
  const colors = accent ? accentMap[accent] : null;

  return (
    <Card className={cn("p-4 flex flex-col justify-between min-h-[100px] shadow-sm", colors?.card, className)} {...props}>
      <div className="flex items-start justify-between">
        <p className={cn("text-[10px] font-bold uppercase tracking-wider", colors ? colors.label : "text-ink-soft/70")}>
          {label}
        </p>
        {icon && (
          <div className={cn("p-1.5 rounded-md", colors ? colors.icon : "text-brand-accent/40 bg-canvas")}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <h3 className={cn("text-xl font-bold leading-none", colors ? colors.value : "text-brand")}>
          {value}
        </h3>
        {trend && (
          <span className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold",
            trend.isUp
              ? "bg-brand-mint/50 text-brand"
              : "bg-danger/10 text-danger"
          )}>
            {trend.isUp ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
    </Card>
  );
}
