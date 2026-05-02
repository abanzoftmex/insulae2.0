import * as React from "react";
import { cn } from "@/shared/utils/cn";
import { Card } from "./card";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    isUp: boolean;
  };
  icon?: React.ReactNode;
}

export function StatCard({ label, value, trend, icon, className, ...props }: StatCardProps) {
  return (
    <Card className={cn("p-4 flex flex-col justify-between min-h-[100px]", className)} {...props}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">
          {label}
        </p>
        {icon && <div className="text-brand-accent/40 p-1.5 bg-canvas rounded-md">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-xl font-bold text-brand leading-none">
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
