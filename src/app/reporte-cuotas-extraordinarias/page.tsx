import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getFeeReportUseCase, toExtraordinaryFeeReportListingVM } from "@/modules/fee-report";
import type { FeeReportCellVM } from "@/modules/fee-report";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cn } from "@/shared/utils/cn";
import { Layers, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Cuotas Extraordinarias | Insulae 2.0",
  description: "Reporte detallado de cobranza extraordinaria y saldos por unidad.",
};

export const dynamic = "force-dynamic";

// ─── Componentes atómicos ─────────────────────────────────────────────────────

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

// ─── Paginador ────────────────────────────────────────────────────────────────

function Paginator({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const buildHref = (p: number) => `/reporte-cuotas-extraordinarias?page=${p}`;
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

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ReporteCuotasExtraordinariasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const listing = await getFeeReportUseCase.execute({
    primaryYear: currentYear - 1,
    secondaryYear: currentYear,
    page,
    pageSize: 20,
    reportType: "EXTRAORDINARY",
  });

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#f3ede4] px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[#d4c5b0] bg-white/90 p-10 shadow-xl">
          <h1 className="text-3xl font-semibold text-[#3a2a1e]">Reporte de cuotas extraordinarias</h1>
          <p className="mt-4 text-sm text-[#7a6050]">
            No se encontró un condominio activo o no existen cargos extraordinarios.
            Verifica la migración de datos.
          </p>
        </section>
      </main>
    );
  }

  const vm = toExtraordinaryFeeReportListingVM(listing);
  const { primaryYear, secondaryYear, previousYear } = vm;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Estado de Cartera Extraordinaria</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Cobranza Extraordinaria</Badge>
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
        <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold tracking-wide" style={{ backgroundColor: "#eef8ee", color: "#1a6020" }}>
          Filas con fondo verde son fracciones privativas (FAP)
        </span>
      </div>

        {/* ── Paginador top ── */}
        {vm.totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">
              {vm.totalAreas} unidades · página {vm.page} de {vm.totalPages}
            </p>
            <Paginator page={vm.page} totalPages={vm.totalPages} />
          </div>
        )}

        {/* ── TABLA ── */}
        <section className="overflow-hidden rounded-[1.6rem] border border-[#c8b59d]/50 bg-white/88 shadow-[0_14px_36px_rgba(30,18,8,0.10)] backdrop-blur-sm">
          {vm.rows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-semibold text-[#3f2f1e]">No hay áreas privativas en esta página</p>
              <p className="mt-2 text-sm text-[#7a5e48]">
                Verifica que los datos de áreas privativas estén migrados a Neon.
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-max border-collapse text-sm">

                {/* THEAD */}
                <thead className="sticky top-0 z-30 shadow-sm">
                  {/* Fila 1: grupos de columnas */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 top-0 z-40 min-w-50 border-b-2 border-r-2 border-[#c8b49a] bg-[#e0d5c8] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#5a4838]"
                    >
                      Área Privativa / FAP
                    </th>
                    {/* Cuotas base y Saldo */}
                    <th colSpan={1} className="border-b border-[#c8b8a0] bg-[#e8ddd0] px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-[#6a5040]">
                      Cuotas Extraordinarias
                    </th>
                    <th colSpan={1} className="border-b border-[#d0b898] bg-[#f0e0c8] px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-[#6a3810]">
                      Saldo actual
                    </th>
                    {/* Meses primaryYear */}
                    <th colSpan={12} className="border-b border-[#b8c8e0] bg-[#dce8f8] px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-[#1a3860]">
                      Pagos mes a mes {primaryYear}
                    </th>
                    {/* Meses secondaryYear */}
                    <th colSpan={12} className="border-b border-[#b0d0b8] bg-[#d8f8e0] px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-[#1a4828]">
                      Pagos mes a mes {secondaryYear}
                    </th>
                  </tr>

                  {/* Fila 2: sub-headers referenciados desde vm.columns */}
                  <tr className="bg-[#ece5d8] text-[9px] font-semibold uppercase tracking-wider text-[#7a5e44]">
                    {vm.columns.map((col) => (
                      <th
                        key={col.key}
                        className="min-w-30 border-b border-[#d8c8b4] px-2 py-2 text-center"
                      >
                        <span className="block leading-snug">{col.label}</span>
                        {col.subLabel && (
                          <span className="block font-normal normal-case text-[#a08060]">{col.subLabel}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* TBODY */}
                <tbody>
                  {vm.rows.map((row, idx) => {
                    const isChild = row.isChild;
                    const baseBg = isChild
                      ? "bg-[#eef8ee]"
                      : idx % 2 === 0 ? "bg-white" : "bg-[#faf6f0]";
                    const stickyBg = isChild ? "bg-[#eef8ee]" : idx % 2 === 0 ? "bg-white" : "bg-[#faf6f0]";

                    return (
                      <tr key={row.id} className={`border-t border-[#e8ddd0] transition-colors hover:brightness-[0.97] ${baseBg}`}>
                        {/* Columna sticky */}
                        <td className={`sticky left-0 z-10 min-w-50 border-r-2 border-[#ddd0be] px-3 py-2 ${stickyBg}`}>
                          <p className={`font-semibold leading-tight ${isChild ? "text-[#1a5c2e] text-[11px]" : "text-[#2b1e12] text-[12px]"}`}>
                            {row.areaLabel}
                          </p>
                          <StatusBadge label={row.statusLabel} css={row.statusCss} />
                        </td>

                        {/* Cuotas Base Extraordinarias */}
                        <td className="border-r border-[#c8b8a0] px-2 py-1.5 text-center">
                          <Cell cell={row.baseFee} />
                        </td>

                        {/* Saldo global */}
                        <td className="border-r-2 border-[#d0b898] px-2 py-1.5 text-center">
                          <Cell cell={row.totalBalance} />
                        </td>

                        {/* 12 meses primaryYear */}
                        {row.monthlyCells
                          .filter((_, i) => i < 12)
                          .map((mc, i) => (
                            <td key={`m${primaryYear}-${i + 1}-${row.id}`} className="border-r border-[#dde8f0] px-2 py-1.5 text-center">
                              <Cell cell={mc} />
                            </td>
                          ))}

                        {/* 12 meses secondaryYear */}
                        {row.monthlyCells
                          .filter((_, i) => i >= 12)
                          .map((mc, i) => (
                            <td key={`m${secondaryYear}-${i + 1}-${row.id}`} className="border-r border-[#d8eedd] px-2 py-1.5 text-center">
                              <Cell cell={mc} />
                            </td>
                          ))}
                      </tr>
                    );
                  })}
                </tbody>

                {/* TFOOT — fila de totales */}
                <tfoot>
                  <tr className="border-t-2 border-[#b0a090] bg-[#e8dfd0] font-bold">
                    <td className="sticky left-0 z-10 border-r-2 border-[#c8b49a] bg-[#e8dfd0] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#3a2a18]">
                      Totales
                    </td>
                    
                    <td className="border-r border-[#c8b8a0] px-2 py-2 text-center">
                      <Cell cell={vm.totalsRow.baseFee} />
                    </td>

                    <td className="border-r-2 border-[#d0b898] px-2 py-2 text-center">
                      <Cell cell={vm.totalsRow.totalBalance} />
                    </td>

                    {vm.totalsRow.monthlyCells.filter((_, i) => i < 12).map((mc, i) => (
                      <td key={`tot-m${primaryYear}-${i + 1}`} className="border-r border-[#d0e4f0] px-2 py-2 text-center">
                        <Cell cell={mc} />
                      </td>
                    ))}
                    {vm.totalsRow.monthlyCells.filter((_, i) => i >= 12).map((mc, i) => (
                      <td key={`tot-m${secondaryYear}-${i + 1}`} className="border-r border-[#c8e8d0] px-2 py-2 text-center">
                        <Cell cell={mc} />
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ── Paginador bottom ── */}
        <div className="flex justify-between items-center py-2 px-1">
          <p className="text-[11px] font-bold text-ink-soft/70 uppercase tracking-widest">
            Cartera extraordinaria consolidada · {vm.totalAreas} unidades en sistema
          </p>
          <Paginator page={vm.page} totalPages={vm.totalPages} />
        </div>
    </div>
  );
}
