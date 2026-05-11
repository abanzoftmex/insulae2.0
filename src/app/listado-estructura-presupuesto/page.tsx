import React from "react";
import type { Metadata } from "next";
import { getBudgetStructureUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { YearSelector } from "../presupuestos/components/year-selector";
import { BudgetStructureWorkbench } from "./components/budget-structure-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export const metadata: Metadata = {
  title: "Estructura Presupuesto | Insulae 2.0",
  description: "Gestión de grupos y conceptos presupuestales anuales.",
};

export const dynamic = "force-dynamic";

export default async function BudgetStructurePage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getUTCFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;
  
  const condo = await prisma.condominium.findFirst({ where: { isActive: true }, select: { id: true, name: true } });
  if (!condo) return <div className="flex items-center justify-center py-20 text-ink-soft font-bold">Sin condominio activo.</div>;

  const vm = await getBudgetStructureUseCase.execute(condo.id, year);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Estructura Presupuestal</h1>
              <YearSelector currentYear={currentYear} selectedYear={year} />
            </div>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condo.name} · Definición de grupos de gasto y partidas operativas.
            </p>
          </div>
        </div>
      </div>

      <BudgetStructureWorkbench initialGroups={vm.groups} year={year} />
    </div>
  );
}
