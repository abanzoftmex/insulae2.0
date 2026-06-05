"use client";

import React, { Fragment } from "react";
import { BudgetVM } from "@/modules/budget";
import { updateBudgetAmountAction, createBudgetAmountAction } from "../actions";
import { cn } from "@/shared/utils/cn";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatMXN(num: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMXNFull(num: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num);
}

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const groupTitles: Record<string, string> = {
  ADMINISTRATION: "Administración",
  MAINTENANCE: "Mantenimiento",
  SECURITY: "Seguridad",
  INFRASTRUCTURE: "Infraestructura",
  EXTRAORDINARY: "Extraordinarios",
  OTHER: "Otros"
};

export default function BudgetTable({ vm }: { vm: BudgetVM }) {
  const isClosed = vm.status === "CLOSED";

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>, conceptId: string, month: number, monthId?: string) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;

    const original = parseFloat(e.target.dataset.original || "0");
    if (val === original) return;

    if (monthId) {
      await updateBudgetAmountAction(vm.year, monthId, val);
    } else {
      if (!vm.id) return;
      await createBudgetAmountAction(vm.year, vm.id, conceptId, month, val);
    }
    e.target.dataset.original = val.toString();
  };

  return (
    <div className="space-y-6">
      {vm.groups.map((group) => {
        const groupName = groupTitles[group.groupData] || group.groupData;
        
        return (
          <Card key={group.groupId} className="overflow-hidden border-transparent shadow-layered">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand-deep/5 flex flex-row items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-[13px] font-bold uppercase text-brand">
                  {groupName}
                </CardTitle>
                {group.groupSubname && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/50 leading-none">
                    {group.groupSubname}
                  </span>
                )}
              </div>
              {isClosed && <Badge variant="danger" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">Lectura Protegida</Badge>}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-480">
                  <thead>
                    <tr className="h-9 bg-canvas/30 border-b border-line text-[10px] font-bold uppercase tracking-tighter text-ink-soft/70">
                      <th className="sticky left-0 z-30 px-4 border-r border-line bg-canvas/95 backdrop-blur-sm shadow-[2px_0_5px_rgba(0,0,0,0.02)] w-60">Concepto</th>
                      <th className="px-4 text-right border-r border-line bg-brand/5 text-brand">Anual Presupuesto</th>
                      <th className="px-4 text-right border-r border-line bg-brand/5 text-brand">Anual Ejercido</th>
                      <th className="px-4 text-right border-r border-line bg-brand/5 text-brand">Anual Saldo</th>
                      {monthNames.map((m) => (
                        <Fragment key={m}>
                          <th className="px-3 text-right border-r border-line/30 font-bold opacity-60">Ppto {m}</th>
                          <th className="px-3 text-right border-r border-line font-bold opacity-80 bg-canvas/20">Ejerc {m}</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/30">
                    {/* Concept Rows */}
                    {group.concepts.map((concept) => (
                      <tr key={concept.conceptId} className="h-10 hover:bg-canvas/10 transition-colors group">
                        <td className="sticky left-0 px-4 text-[12px] font-bold text-ink-soft border-r border-line bg-card shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-canvas/5 transition-colors">
                          {concept.conceptName}
                        </td>
                        <td className="px-4 text-right font-bold text-[12px] text-ink border-r border-line">{formatMXN(concept.budgeted)}</td>
                        <td className="px-4 text-right font-medium text-[12px] text-ink-soft border-r border-line">{formatMXN(concept.generated)}</td>
                        <td className={cn("px-4 text-right font-bold text-[12px] border-r border-line", concept.balance >= 0 ? "text-brand" : "text-danger")}>
                          {formatMXN(concept.balance)}
                        </td>
                        
                        {concept.months.map((m) => (
                          <Fragment key={m.month}>
                            <td className="px-2 py-1.5 w-32 border-r border-line/30">
                              {isClosed ? (
                                <div className="px-2 py-1 text-right text-[11px] font-mono text-ink-soft/40 italic">
                                  {formatMXN(m.budgeted)}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={m.budgeted || ""}
                                  data-original={m.budgeted}
                                  onBlur={(e) => handleBlur(e, concept.conceptId, m.month, m.budgetMonthId)}
                                  className="w-full h-7 bg-canvas/30 border border-transparent rounded px-2 text-right text-[11px] font-mono font-bold focus:bg-card focus:border-brand-accent/30 outline-none transition-all"
                                />
                              )}
                            </td>
                            <td className="px-3 text-right text-[11px] font-mono text-ink-soft/60 border-r border-line bg-canvas/10 italic">
                              {formatMXN(m.generated)}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="h-10 bg-brand-deep/3 border-t border-line">
                      <td className="sticky left-0 px-4 font-bold text-[12px] uppercase text-brand border-r border-line bg-brand-deep/1 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        Total {groupName}
                      </td>
                      <td className="px-4 text-right font-bold text-[13px] text-brand border-r border-line">{formatMXN(group.budgeted)}</td>
                      <td className="px-4 text-right font-bold text-[13px] text-brand border-r border-line">{formatMXN(group.generated)}</td>
                      <td className={cn("px-4 text-right font-bold text-[13px] border-r border-line", group.balance >= 0 ? "text-brand" : "text-danger")}>
                        {formatMXN(group.balance)}
                      </td>
                      
                      {monthNames.map((m, index) => {
                        const monthNumber = index + 1;
                        const monthBudgeted = group.concepts.reduce((sum, c) => sum + (c.months.find(x => x.month === monthNumber)?.budgeted || 0), 0);
                        const monthGenerated = group.concepts.reduce((sum, c) => sum + (c.months.find(x => x.month === monthNumber)?.generated || 0), 0);
                        
                        return (
                          <Fragment key={m}>
                            <td className="px-2 py-1 text-right text-[12px] font-mono font-bold text-brand border-r border-line/30">{formatMXN(monthBudgeted)}</td>
                            <td className="px-3 py-1 text-right text-[12px] font-mono font-bold text-brand border-r border-line bg-canvas/10">{formatMXN(monthGenerated)}</td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="overflow-hidden border-transparent shadow-layered mt-6">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-480">
            <tfoot>
              <tr className="h-12 bg-brand-deep text-white">
                <td className="sticky left-0 px-4 font-bold uppercase text-[13px] border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-60">Total General</td>
                <td className="px-4 text-right font-bold text-[14px] border-r border-white/10 w-[140px]">{formatMXNFull(vm.totalBudgeted)}</td>
                <td className="px-4 text-right font-bold text-[14px] border-r border-white/10 w-[140px]">{formatMXNFull(vm.totalGenerated)}</td>
                <td className="px-4 text-right font-bold text-[14px] border-r border-white/10 w-[140px]">{formatMXNFull(vm.totalBalance)}</td>
                
                {monthNames.map((m, index) => {
                  const monthNumber = index + 1;
                  let totalMonthBudgeted = 0;
                  let totalMonthGenerated = 0;
                  vm.groups.forEach(group => {
                    group.concepts.forEach(c => {
                      totalMonthBudgeted += (c.months.find(x => x.month === monthNumber)?.budgeted || 0);
                      totalMonthGenerated += (c.months.find(x => x.month === monthNumber)?.generated || 0);
                    });
                  });

                  return (
                    <Fragment key={m}>
                      <td className="px-2 py-1 text-right text-[12px] font-mono font-bold text-white/90 border-r border-white/10 w-32">{formatMXNFull(totalMonthBudgeted)}</td>
                      <td className="px-3 py-1 text-right text-[12px] font-mono font-bold text-white/90 border-r border-white/10 bg-white/5 w-32">{formatMXNFull(totalMonthGenerated)}</td>
                    </Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
// Badge is imported at the top of the file
