import React from "react";
import { BudgetSummaryCardVM } from "@/modules/budget/domain/budget.types";
import { cn } from "@/shared/utils/cn";

interface SummaryCardsProps {
  cards: BudgetSummaryCardVM[];
}

function formatMXN(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white">Resumen por Grupo Presupuestal</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line/40">
        {cards.map((card, idx) => {
          const pct = card.budgeted > 0 ? Math.min((card.generated / card.budgeted) * 100, 100) : 0;
          const over = card.generated > card.budgeted;
          return (
            <div key={idx} className="p-4 flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 leading-none">
                {card.title}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-ink-soft/40">Presupuesto</span>
                  <span className="text-[13px] font-bold text-ink tabular-nums">{formatMXN(card.budgeted)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-ink-soft/40">Ejercido</span>
                  <span className={cn("text-[12px] font-bold tabular-nums", over ? "text-danger" : "text-brand")}>
                    {formatMXN(card.generated)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-line/60 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", over ? "bg-danger" : "bg-brand")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={cn("text-[9px] font-bold uppercase tracking-widest text-right leading-none", over ? "text-danger" : "text-ink-soft/40")}>
                {pct.toFixed(0)}% ejecutado
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
