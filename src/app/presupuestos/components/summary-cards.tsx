import React from "react";
import { BudgetSummaryCardVM } from "@/modules/budget/domain/budget.types";
import { cn } from "@/shared/utils/cn";

interface SummaryCardsProps {
  cards: BudgetSummaryCardVM[];
}

function formatMXN(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  const ordinaryCards = cards.filter(c => c.title.toUpperCase().includes("ORDINARIO") && !c.title.toUpperCase().includes("EXTRA"));
  const extraordinaryCards = cards.filter(c => c.title.toUpperCase().includes("EXTRA"));

  const calculateTotals = (items: BudgetSummaryCardVM[]) => {
    const budgeted = items.reduce((acc, c) => acc + c.budgeted, 0);
    const generated = items.reduce((acc, c) => acc + c.generated, 0);
    return { budgeted, generated };
  };

  const ordinaryTotals = calculateTotals(ordinaryCards);
  const extraordinaryTotals = calculateTotals(extraordinaryCards);

  const renderGroup = (title: string, items: BudgetSummaryCardVM[], totals: { budgeted: number; generated: number }, accentColor: string) => {
    if (items.length === 0) return null;
    const totalPct = totals.budgeted > 0 ? Math.min((totals.generated / totals.budgeted) * 100, 100) : 0;
    const totalOver = totals.generated > totals.budgeted;

    return (
      <div className="space-y-3">
        {/* Header with Totals */}
        <div className={cn("p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-canvas/30", 
          accentColor === "brand" ? "border-brand/30 bg-brand/5" : "border-cyan-600/30 bg-cyan-600/5")}>
          <div className="flex flex-col gap-1">
            <h3 className={cn("text-xs font-extrabold uppercase tracking-widest", 
              accentColor === "brand" ? "text-brand" : "text-cyan-700")}>
              {title} (Total)
            </h3>
            <p className="text-[10px] text-ink-soft font-bold uppercase tracking-wider">
              Suma de todos los conceptos de esta categoría
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-ink-soft/40 block">Total Presupuesto</span>
              <span className="text-sm font-bold text-ink tabular-nums">{formatMXN(totals.budgeted)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-ink-soft/40 block">Total Ejercido</span>
              <span className={cn("text-sm font-bold tabular-nums", totalOver ? "text-danger" : "text-brand")}>
                {formatMXN(totals.generated)}
              </span>
            </div>
            <div className="w-32 space-y-1">
              <div className="h-2 w-full rounded-full bg-line/60 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", totalOver ? "bg-danger" : "bg-brand")}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <p className={cn("text-[9px] font-bold uppercase tracking-widest text-right leading-none", totalOver ? "text-danger" : "text-ink-soft/55")}>
                {totalPct.toFixed(0)}% ejecutado
              </p>
            </div>
          </div>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((card, idx) => {
            const pct = card.budgeted > 0 ? Math.min((card.generated / card.budgeted) * 100, 100) : 0;
            const over = card.generated > card.budgeted;
            return (
              <div key={idx} className="p-4 rounded-xl border border-line/40 bg-white hover:shadow-sm transition-all duration-300 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1 min-h-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 leading-none">
                    {card.title}
                  </p>
                  {card.subtitle && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft/40 mt-1 leading-tight">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-ink-soft/40">Presupuesto</span>
                    <span className="text-[12px] font-bold text-ink tabular-nums">{formatMXN(card.budgeted)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-ink-soft/40">Ejercido</span>
                    <span className={cn("text-[11px] font-bold tabular-nums", over ? "text-danger" : "text-brand")}>
                      {formatMXN(card.generated)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="h-1.5 w-full rounded-full bg-line/60 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", over ? "bg-danger" : "bg-brand")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest text-right leading-none mt-1", over ? "text-danger" : "text-ink-soft/40")}>
                    {pct.toFixed(0)}% ejecutado
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Group 1: Presupuesto Ordinario */}
      {renderGroup("Presupuesto Ordinario", ordinaryCards, ordinaryTotals, "brand")}
      
      {/* Group 2: Presupuesto Extraordinario */}
      {renderGroup("Presupuesto Extraordinario", extraordinaryCards, extraordinaryTotals, "cyan")}
    </div>
  );
}
