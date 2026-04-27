import React from "react";
import { BudgetSummaryCardVM } from "@/modules/budget/domain/budget.types";

interface SummaryCardsProps {
  cards: BudgetSummaryCardVM[];
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex flex-col gap-1 transition-all hover:shadow-sm"
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
              {card.title}
            </p>
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-gray-500">Presupuestado</span>
                <span className="text-sm font-bold text-gray-800">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(card.budgeted)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-gray-500">Gastado</span>
                <span className="text-xs font-medium text-gray-600">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(card.generated)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
