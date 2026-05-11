import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getFeeReportUseCase, toFeeReportListingVM } from "@/modules/fee-report";
import type { FeeReportCellVM } from "@/modules/fee-report";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/shared/utils/cn";
import { Layers, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Reporte de Cuotas | Insulae 2.0",
  description: "Reporte detallado de cobranza ordinaria y saldos por unidad.",
};

export const dynamic = "force-dynamic";

// Atomic Cell Component
function Cell({ cell }: { cell: FeeReportCellVM }) {
  return (
    <div className="flex flex-col gap-0.5 py-0.5 leading-none">
      <div className="inline-flex items-center gap-1">
        <span className="rounded-[1px] bg-brand-deep/5 px-1 py-px text-[8px] font-bold text-brand-deep/40">P</span>
        <span className="text-[10px] font-bold text-ink truncate max-w-[80px]">{cell.ownerLabel}</span>
      </div>
      {cell.hasCommerce && (
        <div className="inline-flex items-center gap-1">
          <span className="rounded-[1px] bg-danger/5 px-1 py-px text-[8px] font-bold text-danger/40">C</span>
          <span className="text-[10px] font-bold text-danger truncate max-w-[80px]">{cell.commerceLabel}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, css }: { label: string; css: string }) {
  const variantMap: Record<string, any> = {
    "status-available": "success",
    "status-sold": "brand",
    "status-rented": "warning",
    "status-delinquent": "danger",
    "status-construction": "warning",
    "status-unassigned": "default",
  };
  return <Badge variant={variantMap[css] || "default"} className="mt-0.5">{label}</Badge>;
}

function Paginator({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const buildHref = (p: number) => `/reporte-cuotas?page=${p}`;
  return (
    <div className="flex items-center gap-1.5 h-8">
      <Link href={buildHref(Math.max(1, page - 1))} className={cn("p-1 rounded hover:bg-canvas transition-colors", page === 1 && "opacity-20 pointer-events-none")}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="text-[11px] font-bold uppercase text-ink-soft/60">Página {page} de {totalPages}</span>
      <Link href={buildHref(Math.min(totalPages, page + 1))} className={cn("p-1 rounded hover:bg-canvas transition-colors", page === totalPages && "opacity-20 pointer-events-none")}>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function ReporteCuotasPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getUTCFullYear();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const listing = await getFeeReportUseCase.execute({
    primaryYear: currentYear - 1,
    secondaryYear: currentYear,
    page,
    pageSize: 30,
  });

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft font-bold">
        Sin datos de reporte disponibles.
      </div>
    );
  }

  const vm = toFeeReportListingVM(listing);
  const { primaryYear, secondaryYear, previousYear } = vm;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Estado de Cartera Ordinaria</h1>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.subtitle} · Corte {vm.lastUpdatedLabel}
            </p>
          </div>
        </div>
        <Paginator page={vm.page} totalPages={vm.totalPages} />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total Unidades" value={vm.totalAreas} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="Ciclo Fiscal" value={`${primaryYear} – ${secondaryYear}`} icon={<MapPin className="h-3.5 w-3.5" />} />
        <div className="md:col-span-2 flex items-center gap-4 px-4 py-3 bg-canvas/40 border border-line/30 rounded-md">
           <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tighter">
             <span className="flex items-center gap-1"><span className="w-2 h-2 bg-brand rounded-full" /> Propietario</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 bg-danger rounded-full" /> Comercio</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 bg-success/40 border border-success/60 rounded-[2px]" /> Fracción (FAP)</span>
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-md border border-line shadow-layered bg-card">
        <div className="overflow-auto max-h-[70vh] no-scrollbar">
          <table className="min-w-max border-collapse text-[11px]">
            <thead className="sticky top-0 z-30 shadow-sm border-b border-line">
              {/* Group Headers */}
              <tr className="bg-canvas/95 backdrop-blur-md">
                <th rowSpan={2} className="sticky left-0 z-40 px-4 py-3 text-left border-r border-line bg-canvas font-bold uppercase tracking-widest text-brand w-[180px]">
                  Unidad / FAP
                </th>
                <th colSpan={2} className="px-2 py-1.5 text-center border-r border-line bg-brand-deep/[0.03] font-bold uppercase tracking-widest text-brand-deep/50">
                  Histórico {previousYear}
                </th>
                <th colSpan={3} className="px-2 py-1.5 text-center border-r border-line bg-brand-mint/20 font-bold uppercase tracking-widest text-brand">
                  Ordinarias {primaryYear}
                </th>
                <th colSpan={3} className="px-2 py-1.5 text-center border-r border-line bg-brand-mint/40 font-bold uppercase tracking-widest text-brand">
                  Ordinarias {secondaryYear}
                </th>
                <th className="px-4 py-1.5 text-center border-r border-line bg-gold-soft font-bold uppercase tracking-widest text-gold">
                  Saldo
                </th>
                <th colSpan={12} className="px-2 py-1.5 text-center border-r border-line bg-canvas/30 font-bold uppercase tracking-widest text-ink-soft/40">
                  Mensual {primaryYear}
                </th>
                <th colSpan={12} className="px-2 py-1.5 text-center bg-canvas/50 font-bold uppercase tracking-widest text-ink-soft/40">
                  Mensual {secondaryYear}
                </th>
              </tr>
              {/* Sub Headers */}
              <tr className="bg-canvas/50 text-[9px] font-bold uppercase tracking-tighter text-ink-soft/60">
                {vm.columns.map((col, idx) => (
                  <th key={idx} className={cn("px-2 py-2 text-center border-b border-line", idx < vm.columns.length - 1 && "border-r border-line/30")}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {vm.rows.map((row) => (
                <tr key={row.id} className={cn("h-10 hover:bg-canvas/10 transition-colors group", row.isChild && "bg-success/[0.02]")}>
                  <td className={cn(
                    "sticky left-0 z-10 px-3 py-1.5 border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]",
                    row.isChild ? "bg-success/5" : "bg-card group-hover:bg-canvas transition-colors"
                  )}>
                    <p className={cn("font-bold truncate leading-tight", row.isChild ? "text-success text-[10px]" : "text-brand text-[11px]")}>
                      {row.areaLabel}
                    </p>
                    <StatusBadge label={row.statusLabel} css={row.statusCss} />
                  </td>
                  <td className="px-2 border-r border-line/30 text-center"><Cell cell={row.pastDue} /></td>
                  <td className="px-2 border-r border-line text-center"><Cell cell={row.prepaid} /></td>
                  
                  {/* Years Cells */}
                  {row.yearCells.filter(yc => yc.year === primaryYear).map(yc => (
                    <React.Fragment key={yc.year}>
                      <td className="px-2 border-r border-line/30 text-center bg-brand-mint/[0.02]"><Cell cell={yc.annual} /></td>
                      <td className="px-2 border-r border-line/30 text-center bg-brand-mint/[0.02]"><Cell cell={yc.monthly} /></td>
                      <td className="px-2 border-r border-line text-center bg-brand-mint/5"><Cell cell={yc.balance} /></td>
                    </React.Fragment>
                  ))}
                  {row.yearCells.filter(yc => yc.year === secondaryYear).map(yc => (
                    <React.Fragment key={yc.year}>
                      <td className="px-2 border-r border-line/30 text-center bg-brand-mint/[0.04]"><Cell cell={yc.annual} /></td>
                      <td className="px-2 border-r border-line/30 text-center bg-brand-mint/[0.04]"><Cell cell={yc.monthly} /></td>
                      <td className="px-2 border-r border-line text-center bg-brand-mint/10"><Cell cell={yc.balance} /></td>
                    </React.Fragment>
                  ))}

                  <td className="px-3 border-r border-line text-center bg-gold-soft/20 font-bold"><Cell cell={row.totalBalance} /></td>

                  {/* Monthly Cells */}
                  {row.monthlyCells.map((mc, idx) => (
                    <td key={idx} className={cn("px-2 text-center", idx < row.monthlyCells.length - 1 && "border-r border-line/20", idx >= 12 && "bg-canvas/5")}>
                      <Cell cell={mc} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="h-10 bg-brand-deep text-white font-bold uppercase text-[10px]">
                  <td className="sticky left-0 px-4 border-r border-white/10 bg-brand-deep shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Totales Generales</td>
                  <td className="px-2 border-r border-white/10 text-center"><Cell cell={vm.totalsRow.pastDue} /></td>
                  <td className="px-2 border-r border-white/10 text-center"><Cell cell={vm.totalsRow.prepaid} /></td>
                  
                  {vm.totalsRow.yearCells.filter(yc => yc.year === primaryYear).map(yc => (
                    <React.Fragment key={yc.year}>
                      <td className="px-2 border-r border-white/10 text-center"><Cell cell={yc.annual} /></td>
                      <td className="px-2 border-r border-white/10 text-center"><Cell cell={yc.monthly} /></td>
                      <td className="px-2 border-r border-white/10 text-center"><Cell cell={yc.balance} /></td>
                    </React.Fragment>
                  ))}
                  {vm.totalsRow.yearCells.filter(yc => yc.year === secondaryYear).map(yc => (
                    <React.Fragment key={yc.year}>
                      <td className="px-2 border-r border-white/10 text-center"><Cell cell={yc.annual} /></td>
                      <td className="px-2 border-r border-white/10 text-center"><Cell cell={yc.monthly} /></td>
                      <td className="px-2 border-r border-white/10 text-center"><Cell cell={yc.balance} /></td>
                    </React.Fragment>
                  ))}
                  <td className="px-3 border-r border-white/10 text-center bg-brand-uplift"><Cell cell={vm.totalsRow.totalBalance} /></td>
                  {vm.totalsRow.monthlyCells.map((mc, idx) => (
                    <td key={idx} className={cn("px-2 text-center", idx < vm.totalsRow.monthlyCells.length - 1 && "border-r border-white/5")}>
                      <Cell cell={mc} />
                    </td>
                  ))}
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <div className="flex justify-center py-2">
        <Paginator page={vm.page} totalPages={vm.totalPages} />
      </div>
    </div>
  );
}
