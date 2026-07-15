import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";
import BudgetTable from "./components/budget-table";
import { toggleBudgetStatusAction } from "./actions";
import { YearSelector } from "./components/year-selector";
import { ExcelImport } from "./components/excel-import";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { 
  FileText, 
  Upload, 
  Download, 
  Lock, 
  Unlock, 
  DollarSign, 
  TrendingUp, 
  Calculator,
  Printer
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { SummaryCards } from "./components/summary-cards";
import { PrintButton } from "./components/print-button";

export const metadata: Metadata = {
  title: "Presupuestos | Insulae 2.0",
  description: "Control presupuestal anual por concepto y grupo de gasto.",
};

export const dynamic = "force-dynamic";

async function StatusToggle({ isClosed, budgetId }: { isClosed: boolean, budgetId: string | undefined }) {
  if (!budgetId) return null;
  const actionWithForm = async () => {
    "use server";
    await toggleBudgetStatusAction(budgetId);
  };
  return (
    <form action={actionWithForm}>
      <button 
        type="submit" 
        className={cn(
          "h-8 px-3 flex items-center gap-2 rounded-pill font-bold text-[10px] uppercase transition-all active-scale border",
          isClosed ? "bg-danger/10 border-danger/20 text-danger hover:bg-danger/20" : "bg-brand-mint border-brand/10 text-brand hover:bg-brand-mint/80"
        )}
      >
        {isClosed ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        <span>{isClosed ? "Cerrado" : "Abierto"}</span>
      </button>
    </form>
  );
}

export default async function PresupuestosPage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getUTCFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;
  
  const condo = await prisma.condominium.findFirst({ where: { isActive: true }, select: { id: true, name: true, slug: true } });
  if (!condo) return <div className="flex items-center justify-center py-20 text-ink-soft">Sin condominio activo.</div>;

  const vm = await getBudgetByYearUseCase.execute(condo.id, year);
  const isClosed = vm.status === "CLOSED";
  const ordinaryCards = vm.summaryCards.filter(c => c.title.toUpperCase().includes("ORDINARIO") && !c.title.toUpperCase().includes("EXTRA"));
  const extraordinaryCards = vm.summaryCards.filter(c => c.title.toUpperCase().includes("EXTRA"));

  const sumOrdinaryBudget = ordinaryCards.reduce((acc, c) => acc + c.budgeted, 0);
  const sumOrdinaryGenerated = ordinaryCards.reduce((acc, c) => acc + c.generated, 0);

  const sumExtraBudget = extraordinaryCards.reduce((acc, c) => acc + c.budgeted, 0);
  const sumExtraGenerated = extraordinaryCards.reduce((acc, c) => acc + c.generated, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Presupuesto {year}</h1>
              <YearSelector currentYear={currentYear} selectedYear={year} />
            </div>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Planeación Financiera</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condo.name} · Planeación y ejecución financiera anual.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusToggle isClosed={isClosed} budgetId={vm.id} />
          <ExcelImport year={year} isClosed={isClosed} />
          <PrintButton />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            aside,
            nav,
            header,
            footer,
            .no-print,
            .print\\:hidden,
            a[href*="wa.me"],
            button,
            form,
            .page-back-badge,
            .flex-wrap.items-center.gap-2 {
              display: none !important;
            }

            body {
              background: #fff !important;
              color: #000 !important;
            }

            div[class*="lg:pl-"],
            div[class*="lg:pl["],
            main {
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }

            .shadow-layered,
            .shadow-md {
              box-shadow: none !important;
              border: 1px solid #e5e7eb !important;
            }
            
            .overflow-hidden,
            .overflow-x-auto,
            .no-scrollbar {
              overflow: visible !important;
            }

            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Clean table for print layout */
            table {
              table-layout: auto !important;
              width: 100% !important;
              min-width: 0 !important;
            }

            th, td {
              width: auto !important;
              min-width: 0 !important;
              max-width: none !important;
              position: static !important;
              background: transparent !important;
              box-shadow: none !important;
              left: auto !important;
            }
          }
        `
      }} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard 
          accent="brand"
          label={`Ordinario ${year}`} 
          value={new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(sumOrdinaryBudget)} 
          trend={{
            value: `Ejercido: ${new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(sumOrdinaryGenerated)}`,
            isUp: true
          }}
          icon={<Calculator className="h-3.5 w-3.5" />} 
        />
        <StatCard 
          accent="cyan"
          label={`Extraordinario ${year}`} 
          value={new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(sumExtraBudget)} 
          trend={{
            value: `Ejercido: ${new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(sumExtraGenerated)}`,
            isUp: true
          }}
          icon={<TrendingUp className="h-3.5 w-3.5" />} 
        />
        <StatCard 
          accent="lime"
          label={`Total Consolidado`} 
          value={new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(vm.totalBudgeted)} 
          trend={{
            value: `Disponible: ${new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2}).format(vm.totalBalance)}`,
            isUp: vm.totalBalance >= 0
          }}
          icon={<DollarSign className="h-3.5 w-3.5" />} 
        />
      </div>

      {/* Detalle por cuota */}
      <div className="animate-in slide-in-from-bottom-2 duration-500 delay-150">
        <SummaryCards cards={vm.summaryCards} />
      </div>

      {/* Main Budget Table */}
      <div className="animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <BudgetTable vm={vm} condominiumSlug={condo.slug} projectId={condo.id} />
      </div>
    </div>
  );
}
