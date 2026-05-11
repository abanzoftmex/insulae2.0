import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";
import BudgetTable from "./components/budget-table";
import { toggleBudgetStatusAction, importBudgetExcelAction } from "./actions";
import { YearSelector } from "./components/year-selector";
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

function ExcelImport({ year, isClosed }: { year: number, isClosed: boolean }) {
  if (isClosed) return null;
  const actionWithYear = async (formData: FormData) => {
    "use server";
    await importBudgetExcelAction(year, formData);
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-canvas-2 rounded-lg border border-line/50">
      <Link 
        href={`/presupuestos/plantilla?anio=${year}`} 
        className="h-7 px-3 flex items-center gap-1.5 text-ink-soft hover:text-ink text-[11px] font-semibold uppercase transition-colors"
        download
      >
        <Download className="h-3 w-3" /> Plantilla
      </Link>
      <div className="w-px h-4 bg-line" />
      <form action={actionWithYear} className="flex items-center gap-2">
        <label className="h-7 px-3 flex items-center justify-center rounded-pill border border-brand-accent text-brand-accent text-[11px] font-semibold uppercase cursor-pointer hover:bg-brand-accent/5 transition-standard">
          <Upload className="h-3 w-3 mr-1" /> Importar
          <input type="file" name="file" accept=".xlsx" required className="hidden" />
        </label>
        <button type="submit" className="hidden" id="submit-import" />
      </form>
    </div>
  );
}

export default async function PresupuestosPage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getUTCFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;
  
  const condo = await prisma.condominium.findFirst({ where: { isActive: true }, select: { id: true, name: true } });
  if (!condo) return <div className="flex items-center justify-center py-20 text-ink-soft">Sin condominio activo.</div>;

  const vm = await getBudgetByYearUseCase.execute(condo.id, year);
  const isClosed = vm.status === "CLOSED";

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
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condo.name} · Planeación y ejecución financiera anual.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusToggle isClosed={isClosed} budgetId={vm.id} />
          <ExcelImport year={year} isClosed={isClosed} />
          <Link
            href={`/presupuestos/imprimir?anio=${year}`}
            target="_blank"
            className="h-8 px-4 flex items-center gap-2 bg-brand-deep text-white rounded-full text-[10px] font-bold uppercase hover:bg-brand transition-all shadow-md shadow-brand-deep/25"
          >
            <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden /> PDF
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard 
          label={`Prespuesto ${year}`} 
          value={new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", maximumFractionDigits: 0}).format(vm.totalBudgeted)} 
          icon={<Calculator className="h-3.5 w-3.5" />} 
        />
        <StatCard 
          label={`Ejercido ${year}`} 
          value={new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", maximumFractionDigits: 0}).format(vm.totalGenerated)} 
          icon={<TrendingUp className="h-3.5 w-3.5" />} 
        />
        <StatCard 
          label="Saldo de Proyecto" 
          value={new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", maximumFractionDigits: 0}).format(vm.totalBalance)} 
          icon={<DollarSign className="h-3.5 w-3.5" />} 
          className={cn(vm.totalBalance >= 0 ? "bg-brand-mint/40 border-brand-accent/20" : "bg-danger/10 border-danger/20")}
        />
      </div>

      {/* Detalle por cuota */}
      <div className="animate-in slide-in-from-bottom-2 duration-500 delay-150">
        <SummaryCards cards={vm.summaryCards} />
      </div>

      {/* Main Budget Table */}
      <div className="animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <BudgetTable vm={vm} />
      </div>
    </div>
  );
}
