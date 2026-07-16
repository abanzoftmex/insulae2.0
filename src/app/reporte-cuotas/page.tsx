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
    <div className="flex flex-col gap-0.5 py-0.5">
      <div className="inline-flex items-center gap-1">
        <span className="rounded bg-[#dce8fd] px-1 py-px text-[9px] font-bold text-[#1a3d8f]">P</span>
        <span className="text-[11px] font-semibold text-[#1e2735]">{cell.ownerLabel}</span>
      </div>
      {cell.hasCommerce && (
        <div className="inline-flex items-center gap-1">
          <span className="rounded bg-[#fddce8] px-1 py-px text-[9px] font-bold text-[#8f1a3d]">C</span>
          <span className="text-[11px] font-semibold text-[#35202a]">{cell.commerceLabel}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, css }: { label: string; css: string }) {
  const colorMap: Record<string, string> = {
    "status-available": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "status-sold": "bg-blue-50 text-blue-700 border-blue-200",
    "status-rented": "bg-amber-50 text-amber-700 border-amber-200",
    "status-delinquent": "bg-red-50 text-red-700 border-red-200",
    "status-construction": "bg-orange-50 text-orange-700 border-orange-200",
    "status-unassigned": "bg-stone-50 text-stone-500 border-stone-200",
  };
  const cls = colorMap[css] ?? "bg-stone-50 text-stone-500 border-stone-200";
  return (
    <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-px text-[9px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function Paginator({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const buildHref = (p: number) => `/reporte-cuotas?page=${p}`;
  return (
    <div className="flex items-center gap-3">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-brand hover:text-white hover:border-brand",
          page === 1 && "opacity-30 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Anterior
      </Link>
      <span className="text-[11px] font-bold uppercase text-ink-soft/80 tabular-nums">
        Pág {page} / {totalPages}
      </span>
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-brand hover:text-white hover:border-brand",
          page === totalPages && "opacity-30 pointer-events-none"
        )}
      >
        Siguiente <ChevronRight className="h-3.5 w-3.5" />
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
    pageSize: 100,
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
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Cobranza Ordinaria</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.subtitle} · Corte {vm.lastUpdatedLabel}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard accent="brand" label="Total Unidades" value={vm.totalAreas} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard accent="cyan" label="Ciclo Fiscal" value={`${primaryYear} – ${secondaryYear}`} icon={<MapPin className="h-3.5 w-3.5" />} />
      </div>

      {/* Simbología */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft/50 shrink-0">Simbología:</p>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold tracking-wide" style={{ backgroundColor: "#dce8fd", color: "#1a3d8f" }}>
          Propietario
        </span>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold tracking-wide" style={{ backgroundColor: "#fddce8", color: "#8f1a3d" }}>
          Comercio
        </span>
        <span className="inline-flex items-center rounded-full border border-stone-200 px-3 py-1 text-[10px] font-bold tracking-wide bg-stone-50 text-stone-500">
          Fracción (FAP)
        </span>
      </div>

      {/* Main Table */}
      {vm.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">
            {vm.totalAreas} unidades · página {vm.page} de {vm.totalPages}
          </p>
          <Paginator page={vm.page} totalPages={vm.totalPages} />
        </div>
      )}

      {/* ── TABLA ── */}
      <section className="overflow-hidden rounded-card border border-line bg-card shadow-layered backdrop-blur-sm">
        {vm.rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-semibold text-brand">No hay áreas privativas en esta página</p>
            <p className="mt-2 text-sm text-ink-soft">
              Verifica que los datos de áreas privativas estén migrados a Neon.
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[75vh]">
            <table className="min-w-max border-collapse text-sm">
              <thead className="sticky top-0 z-30 shadow-sm">
                {/* Fila 1: grupos de columnas */}
                <tr className="bg-brand/10 text-brand">
                  <th
                    rowSpan={2}
                    className="sticky left-0 top-0 z-40 min-w-50 border-b-2 border-r-2 border-line bg-canvas px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand"
                  >
                    Área Privativa / FAP
                  </th>
                  <th colSpan={2} className="border-b border-r border-line/60 bg-brand/5 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest">
                    Histórico {previousYear}
                  </th>
                  <th colSpan={3} className="border-b border-r border-line/60 bg-brand/5 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest">
                    Ordinarias {primaryYear}
                  </th>
                  <th colSpan={3} className="border-b border-r border-line/60 bg-brand/5 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest">
                    Ordinarias {secondaryYear}
                  </th>
                  <th colSpan={1} className="border-b border-r-2 border-line bg-brand/15 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-brand-deep">
                    Saldo actual
                  </th>
                  <th colSpan={12} className="border-b border-r border-line/60 bg-brand/5 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest">
                    Pagos mes a mes {primaryYear}
                  </th>
                  <th colSpan={12} className="border-b border-line/60 bg-brand/5 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest">
                    Pagos mes a mes {secondaryYear}
                  </th>
                </tr>

                {/* Fila 2: sub-headers */}
                <tr className="bg-canvas text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
                  {vm.columns.map((col, idx) => (
                    <th
                      key={col.key || idx}
                      className={cn(
                        "min-w-30 border-b border-line px-2 py-2 text-center",
                        idx < vm.columns.length - 1 && "border-r border-line/40"
                      )}
                    >
                      <span className="block leading-snug">{col.label}</span>
                      {col.subLabel && (
                        <span className="block font-normal normal-case text-ink-soft/70">{col.subLabel}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* TBODY */}
              <tbody>
                {vm.rows.map((row, idx) => {
                  const isChild = row.isChild;
                  const baseBg = idx % 2 === 0 ? "bg-card" : "bg-canvas/20";
                  const stickyBg = idx % 2 === 0 ? "bg-card" : "bg-canvas/20";

                  return (
                    <tr key={row.id} className={cn("border-t border-line/60 transition-colors hover:bg-brand-mint/10", baseBg)}>
                      {/* Columna sticky */}
                      <td className={cn("sticky left-0 z-10 min-w-50 border-r-2 border-line px-3 py-2", stickyBg)}>
                        <p className={cn("font-semibold leading-tight text-ink", isChild ? "text-[11px] pl-4 opacity-80" : "text-[12px]")}>
                          {row.areaLabel}
                        </p>
                        <StatusBadge label={row.statusLabel} css={row.statusCss} />
                      </td>

                      {/* Histórico pastDue y prepaid */}
                      <td className="border-r border-line/40 px-2 py-1.5 text-center">
                        <Cell cell={row.pastDue} />
                      </td>
                      <td className="border-r border-line/60 px-2 py-1.5 text-center">
                        <Cell cell={row.prepaid} />
                      </td>

                      {/* Years Cells for primaryYear */}
                      {row.yearCells.filter(yc => yc.year === primaryYear).map(yc => (
                        <React.Fragment key={yc.year}>
                          <td className="border-r border-line/40 px-2 py-1.5 text-center"><Cell cell={yc.annual} /></td>
                          <td className="border-r border-line/40 px-2 py-1.5 text-center"><Cell cell={yc.monthly} /></td>
                          <td className="border-r border-line/60 px-2 py-1.5 text-center"><Cell cell={yc.balance} /></td>
                        </React.Fragment>
                      ))}

                      {/* Years Cells for secondaryYear */}
                      {row.yearCells.filter(yc => yc.year === secondaryYear).map(yc => (
                        <React.Fragment key={yc.year}>
                          <td className="border-r border-line/40 px-2 py-1.5 text-center"><Cell cell={yc.annual} /></td>
                          <td className="border-r border-line/40 px-2 py-1.5 text-center"><Cell cell={yc.monthly} /></td>
                          <td className="border-r border-line/60 px-2 py-1.5 text-center"><Cell cell={yc.balance} /></td>
                        </React.Fragment>
                      ))}

                      {/* Saldo global */}
                      <td className="border-r-2 border-line px-2 py-1.5 text-center font-bold bg-brand-deep/3">
                        <Cell cell={row.totalBalance} />
                      </td>

                      {/* 12 meses primaryYear */}
                      {row.monthlyCells.filter((_, i) => i < 12).map((mc, i) => (
                        <td key={`m${primaryYear}-${i + 1}-${row.id}`} className="border-r border-line/40 px-2 py-1.5 text-center">
                          <Cell cell={mc} />
                        </td>
                      ))}

                      {/* 12 meses secondaryYear */}
                      {row.monthlyCells.filter((_, i) => i >= 12).map((mc, i) => (
                        <td key={`m${secondaryYear}-${i + 1}-${row.id}`} className={cn("px-2 py-1.5 text-center", i < 11 && "border-r border-line/40")}>
                          <Cell cell={mc} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>

              {/* TFOOT — fila de totales */}
              <tfoot>
                <tr className="border-t-2 border-brand/20 bg-brand/5 font-bold">
                  <td className="sticky left-0 z-10 border-r-2 border-line bg-brand/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand">
                    Totales
                  </td>
                  
                  <td className="border-r border-line/40 px-2 py-2 text-center">
                    <Cell cell={vm.totalsRow.pastDue} />
                  </td>
                  <td className="border-r border-line/60 px-2 py-2 text-center">
                    <Cell cell={vm.totalsRow.prepaid} />
                  </td>

                  {vm.totalsRow.yearCells.filter(yc => yc.year === primaryYear).map(yc => (
                    <React.Fragment key={yc.year}>
                      <td className="border-r border-line/40 px-2 py-2 text-center"><Cell cell={yc.annual} /></td>
                      <td className="border-r border-line/40 px-2 py-2 text-center"><Cell cell={yc.monthly} /></td>
                      <td className="border-r border-line/60 px-2 py-2 text-center"><Cell cell={yc.balance} /></td>
                    </React.Fragment>
                  ))}

                  {vm.totalsRow.yearCells.filter(yc => yc.year === secondaryYear).map(yc => (
                    <React.Fragment key={yc.year}>
                      <td className="border-r border-line/40 px-2 py-2 text-center"><Cell cell={yc.annual} /></td>
                      <td className="border-r border-line/40 px-2 py-2 text-center"><Cell cell={yc.monthly} /></td>
                      <td className="border-r border-line/60 px-2 py-2 text-center"><Cell cell={yc.balance} /></td>
                    </React.Fragment>
                  ))}

                  <td className="border-r-2 border-line px-2 py-2 text-center bg-brand-deep/3">
                    <Cell cell={vm.totalsRow.totalBalance} />
                  </td>

                  {vm.totalsRow.monthlyCells.filter((_, i) => i < 12).map((mc, i) => (
                    <td key={`tot-m${primaryYear}-${i + 1}`} className="border-r border-line/40 px-2 py-2 text-center">
                      <Cell cell={mc} />
                    </td>
                  ))}
                  {vm.totalsRow.monthlyCells.filter((_, i) => i >= 12).map((mc, i) => (
                    <td key={`tot-m${secondaryYear}-${i + 1}`} className={cn("px-2 py-2 text-center", i < 11 && "border-r border-line/40")}>
                      <Cell cell={mc} />
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <div className="flex justify-between items-center py-2 px-1">
        <p className="text-[11px] font-bold text-ink-soft/70 uppercase tracking-widest">
          Cartera ordinaria consolidada · {vm.totalAreas} unidades en sistema
        </p>
        <Paginator page={vm.page} totalPages={vm.totalPages} />
      </div>
    </div>
  );
}

