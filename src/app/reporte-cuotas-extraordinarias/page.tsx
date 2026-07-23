import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getFeeReportUseCase, toExtraordinaryFeeReportListingVM } from "@/modules/fee-report";
import type { FeeReportCellVM } from "@/modules/fee-report";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/ui/paginator";
import { cn } from "@/shared/utils/cn";
import { 
  Layers, 
  MapPin, 
  Wallet, 
  Pencil, 
  Images, 
  Briefcase, 
  Store, 
  Plus, 
  Filter, 
  X,
  FileText,
  Shield,
  Download,
  FileSpreadsheet
} from "lucide-react";

export const metadata: Metadata = {
  title: "Cuotas Extraordinarias | Insulae 2.0",
  description: "Reporte detallado de cobranza extraordinaria y saldos por unidad.",
};

export const dynamic = "force-dynamic";

function renderFinancialCards(
  cell: FeeReportCellVM,
  paymentStatusColor?: "green" | "red" | "yellow",
): React.ReactNode {
  const ownerAmount = cell.ownerLabel;
  const commerceAmount = cell.commerceLabel;
  const showCommerce = cell.hasCommerce;

  const isZeroOrMuted = (amount: string) => {
    const clean = amount.trim();
    if (clean.startsWith("-")) return true;
    const hasNonZeroDigits = /[1-9]/.test(clean);
    return !hasNonZeroDigits;
  };

  const getCardStyle = (amount: string, isOwner: boolean) => {
    if (isZeroOrMuted(amount)) {
      return isOwner
        ? {
            bgClass: "bg-[#faf6f0] border-[#c8b8a0]/30",
            labelClass: "text-[#7a5e44]/60",
            valueClass: "text-[#5a4838] font-medium"
          }
        : {
            bgClass: "bg-[#fdf6fa] border-[#f5e0eb]",
            labelClass: "text-[#8f1a3d]/60",
            valueClass: "text-[#35202a] font-medium"
          };
    }

    if (paymentStatusColor === "red") {
      return {
        bgClass: "bg-rose-50 border-rose-200",
        labelClass: "text-rose-600/70",
        valueClass: "text-[#dc2626] font-bold"
      };
    }
    if (paymentStatusColor === "yellow") {
      return {
        bgClass: "bg-amber-50 border-amber-200",
        labelClass: "text-amber-600/70",
        valueClass: "text-[#d97706] font-bold"
      };
    }
    if (paymentStatusColor === "green") {
      return {
        bgClass: "bg-emerald-50 border-emerald-200",
        labelClass: "text-emerald-700/70",
        valueClass: "text-[#16a34a] font-bold"
      };
    }

    if (isOwner) {
      return {
        bgClass: "bg-[#fdfbf7] border-[#c8b8a0]/40",
        labelClass: "text-[#7a5e44]",
        valueClass: "text-[#2b1e12] font-bold"
      };
    } else {
      return {
        bgClass: "bg-[#fff5f7] border-[#f5c0d0]/40",
        labelClass: "text-[#8f1a3d]",
        valueClass: "text-[#501020] font-bold"
      };
    }
  };

  const ownerStyle = getCardStyle(ownerAmount, true);
  const commerceStyle = getCardStyle(commerceAmount, false);

  return (
    <div className="space-y-0.5">
      <div className={cn("flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded border transition-colors", ownerStyle.bgClass)}>
        <span className={cn("text-[8px] font-bold shrink-0", ownerStyle.labelClass)}>P</span>
        <span className={cn("text-[11px] tabular-nums truncate", ownerStyle.valueClass)}>{ownerAmount}</span>
      </div>
      {showCommerce && (
        <div className={cn("flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded border transition-colors", commerceStyle.bgClass)}>
          <span className={cn("text-[8px] font-bold shrink-0", commerceStyle.labelClass)}>C</span>
          <span className={cn("text-[11px] tabular-nums truncate", commerceStyle.valueClass)}>{commerceAmount}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, css }: { label: string; css: string }) {
  const isInactive = label.toUpperCase().includes("INACTIVO") || css.includes("unassigned") || css.includes("delinquent");
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase border inline-block mt-0.5",
        isInactive
          ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
          : "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
      )}
    >
      {label}
    </span>
  );
}

function renderRowActionButtons(areaId: string, isChild: boolean) {
  return (
    <div className="flex flex-wrap gap-1 w-[80px]">
      <Link
        href={`/areas-privativas/${areaId}`}
        title="Editar base"
        className="h-6 w-6 flex items-center justify-center rounded border border-[#c8b8a0]/30 bg-[#faf6f0] text-[#7a5e44] hover:bg-[#7a5e44] hover:text-white transition-all"
      >
        <Pencil className="h-3 w-3" />
      </Link>
      <Link
        href={`/areas-privativas/${areaId}/imagenes`}
        title="Galería"
        className="h-6 w-6 flex items-center justify-center rounded border border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white transition-all"
      >
        <Images className="h-3 w-3" />
      </Link>
      <Link
        href={`/areas-privativas/listado-pagos?id=${areaId}&opc=1`}
        title="Pagos propietario"
        className="h-6 w-6 flex items-center justify-center rounded border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all"
      >
        <Wallet className="h-3 w-3" />
      </Link>
      {isChild && (
        <Link
          href={`/areas-privativas/listado-pagos?id=${areaId}&opc=2`}
          title="Pagos comercio"
          className="h-6 w-6 flex items-center justify-center rounded border border-[#e9d5ff] bg-[#f3e8ff] text-[#9333ea] hover:bg-[#9333ea] hover:text-white transition-all"
        >
          <Briefcase className="h-3 w-3" />
        </Link>
      )}
      <Link
        href={`/areas-privativas/${areaId}/arrendamiento`}
        title="Arrendamiento"
        className="h-6 w-6 flex items-center justify-center rounded border border-lime-200 bg-lime-50 text-lime-700 hover:bg-lime-600 hover:text-white transition-all"
      >
        <Store className="h-3 w-3" />
      </Link>
      {!isChild && (
        <Link
          href={`/areas-privativas/nueva?parentId=${areaId}`}
          title="Agregar FAP"
          className="h-6 w-6 flex items-center justify-center rounded border border-green-700 bg-green-600 text-white hover:bg-green-700 transition-all"
        >
          <Plus className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; pageSize?: string }>;
}

export default async function ReporteCuotasExtraordinariasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = Math.max(30, parseInt(params.pageSize ?? "30", 10) || 30);
  const query = params.q ?? "";

  const listing = await getFeeReportUseCase.execute({
    primaryYear: currentYear - 1,
    secondaryYear: currentYear,
    page,
    pageSize,
    reportType: "EXTRAORDINARY",
  });

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin datos extraordinarios</h2>
        <p className="text-sm">No se encontró un condominio activo para construir el reporte extraordinario.</p>
      </div>
    );
  }

  const vm = toExtraordinaryFeeReportListingVM(listing);
  const { primaryYear, secondaryYear, previousYear } = vm;

  const buildHref = (nextPage: number) => {
    const url = new URLSearchParams();
    if (query) url.set("q", query);
    url.set("pageSize", String(pageSize));
    url.set("page", String(nextPage));
    return `/reporte-cuotas-extraordinarias?${url.toString()}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* ── HEADER SUPERIOR (MISMAS ACCIONES QUE ÁREAS PRIVATIVAS) ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#4c4a24]/20">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-extrabold text-[#4c4a24] tracking-tighter uppercase">
              Estado de Cartera Extraordinaria
            </h1>
            <p className="text-[#7a5e44] text-[11px] font-bold uppercase tracking-tight">
              {vm.subtitle} &middot; Corte {vm.lastUpdatedLabel}
            </p>
          </div>
        </div>

        {/* Acciones principales superiores */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-bold uppercase rounded-full border-[#c8b8a0] bg-white text-[#5a4838] hover:bg-[#faf6f0]">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-bold uppercase rounded-full border-[#c8b8a0] bg-white text-[#5a4838] hover:bg-[#faf6f0]">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Plantilla
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full bg-[#4c4a24] text-white hover:bg-[#3b3a1c]">
            <Link href="/listado-seguridad"><Shield className="h-3.5 w-3.5" /> Seguridad</Link>
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full bg-[#4c4a24] text-white hover:bg-[#3b3a1c]">
            <Link href="/reporte-condominio"><FileText className="h-3.5 w-3.5" /> Reporte</Link>
          </Button>
        </div>
      </div>

      {/* ── TARJETAS KPI ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#c8b8a0]/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a5e44]">Total Unidades</p>
            <p className="text-2xl font-bold text-[#2b1e12] tabular-nums mt-0.5">{vm.totalAreas}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-[#4c4a24] text-white flex items-center justify-center">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#c8b8a0]/40 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a5e44]">Ciclo Fiscal</p>
            <p className="text-2xl font-bold text-[#2b1e12] tabular-nums mt-0.5">{primaryYear} – {secondaryYear}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-[#0e7490] text-white flex items-center justify-center">
            <MapPin className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#c8b8a0]/40 shadow-xs flex items-center justify-between col-span-1 md:col-span-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#7a5e44]">Simbología de Extraordinarias</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#faf6f0] border border-[#c8b8a0]/40 text-[#7a5e44]">
                P: Propietario
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fdf6fa] border border-[#f5e0eb] text-[#8f1a3d]">
                C: Comercio
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA VERDE DE FILTROS (DISEÑO ÁREAS PRIVATIVAS) ── */}
      <div className="overflow-hidden rounded-card border border-[#c8b8a0]/40 bg-white shadow-sm">
        <div className="px-4 py-2.5 bg-[#4c4a24] text-white flex items-center gap-2 rounded-t-card">
          <Filter className="h-3.5 w-3.5 text-white/80" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white">Filtros de búsqueda</p>
        </div>
        <form className="p-4 flex flex-wrap items-end gap-3" method="get">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#7a5e44] leading-none mb-1.5 block">
              Buscar
            </label>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Código, nombre de área..."
              className="h-8 w-full rounded-md border border-[#c8b8a0]/50 bg-white px-3 text-xs outline-none focus:border-[#4c4a24]"
            />
          </div>

          <div className="w-32">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#7a5e44] leading-none mb-1.5 block">
              Registros
            </label>
            <select
              name="pageSize"
              defaultValue={pageSize}
              className="h-8 w-full rounded-md border border-[#c8b8a0]/50 bg-white px-2 text-xs font-medium outline-none"
            >
              <option value="30">30 por pág</option>
              <option value="50">50 por pág</option>
              <option value="100">100 por pág</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="h-8 text-[10px] font-bold uppercase gap-1.5 bg-[#4c4a24] hover:bg-[#3b3a1c] text-white">
              <Filter className="h-3 w-3" /> Filtrar
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold uppercase px-3 border border-[#c8b8a0]">
              <Link href="/reporte-cuotas-extraordinarias" title="Eliminar filtros">
                <X className="h-3.5 w-3.5 text-[#7a5e44]" />
              </Link>
            </Button>
          </div>
        </form>
      </div>

      {/* ── PAGINADOR NÚMEROS (CIRCULAR) ── */}
      <Paginator
        page={vm.page}
        totalPages={vm.totalPages}
        totalRows={vm.totalAreas}
        hasPrev={vm.page > 1}
        hasNext={vm.page < vm.totalPages}
        prevHref={buildHref(Math.max(1, vm.page - 1))}
        nextHref={buildHref(Math.min(vm.totalPages, vm.page + 1))}
      />

      {/* ── TABLA EXTENSIVA CON CSS Y ESTILO IDÉNTICO A ÁREAS PRIVATIVAS ── */}
      <section className="overflow-hidden border-t border-b border-[#c8b59d]/50 bg-white/88 shadow-[0_14px_36px_rgba(30,18,8,0.10)] backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-10 -mb-4 md:-mb-6 lg:-mb-8 rounded-none">
        <style dangerouslySetInnerHTML={{ __html: `
          .fap-inventory-table td {
            border-top: 1px solid #e5d8c8 !important;
          }
          .fap-block-start td {
            border-top: 2.5px solid #a89678 !important;
          }
          .fap-block-end td {
            border-bottom: 2.5px solid #a89678 !important;
          }
        `}} />
        <div className="overflow-auto max-h-[75vh]">
          <table className="fap-inventory-table min-w-max border-separate border-spacing-0 text-sm">
            
            {/* THEAD */}
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr className="bg-[#e0d5c8] text-left text-[10px] font-bold uppercase tracking-widest text-[#5a4838]">
                <th className="sticky left-0 top-0 z-50 px-2 py-3 border-b border-r border-[#c8b49a] bg-[#e0d5c8] min-w-[100px]">
                  ACCIONES
                </th>
                <th className="sticky left-[100px] top-0 z-50 px-3 py-3 border-b border-r border-[#c8b49a] bg-[#e0d5c8] min-w-[110px]">
                  UBICACIÓN
                </th>
                <th className="sticky left-[210px] top-0 z-50 px-3 py-3 border-b border-r-2 border-[#c8b49a] bg-[#e0d5c8] min-w-[290px]">
                  ÁREA PRIVATIVA/ FRACCIÓN DE ÁREA PRIVATIVA
                </th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] text-center min-w-[220px]">
                  CUOTAS EXTRAORDINARIAS {previousYear} - {primaryYear}
                </th>
                <th className="px-3 py-3 border-b border-[#d0b898] bg-[#f0e0c8] text-[#6a3810] font-bold text-center min-w-[180px]">
                  SALDO ACTUAL
                </th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={`m1-${i}`} className="px-3 py-3 border-b border-[#d8c8b4] bg-[#ece5d8] text-[9px] font-semibold text-[#7a5e44] text-center min-w-[110px]">
                    {String(i + 1).padStart(2, "0")}/{primaryYear}
                  </th>
                ))}
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={`m2-${i}`} className="px-3 py-3 border-b border-[#d8c8b4] bg-[#ece5d8] text-[9px] font-semibold text-[#7a5e44] text-center min-w-[110px]">
                    {String(i + 1).padStart(2, "0")}/{secondaryYear}
                  </th>
                ))}
              </tr>
            </thead>

            {/* TBODY */}
            <tbody className="divide-y divide-[#e8ddd0] text-[#2b1e12]">
              {vm.rows.map((row, rowIdx) => {
                const isChild = row.isChild;
                const nextRow = vm.rows[rowIdx + 1];
                const isParent = !isChild && (nextRow?.isChild ?? false);

                const isBlockStart = isParent;
                const isBlockEnd = (isChild || isParent) && (!nextRow || !nextRow.isChild);

                const rowBg = isParent
                  ? "bg-[#dfcfb9]"
                  : isChild
                  ? "bg-[#f0e6d6]"
                  : "bg-white";

                const blockRowClass = cn(
                  isBlockStart && "fap-block-start",
                  isBlockEnd && "fap-block-end"
                );

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "h-12 border-t border-[#e8ddd0] transition-colors hover:brightness-[0.97] group",
                      rowBg,
                      blockRowClass
                    )}
                  >
                    {/* Sticky Column 1: Acciones (Red de 6 botones coloridos igual que en Áreas Privativas) */}
                    <td className={cn("sticky left-0 z-20 px-2 py-1.5 border-r border-[#ddd0be] shadow-[2px_0_5px_rgba(30,18,8,0.02)] transition-colors", rowBg)}>
                      {renderRowActionButtons(row.id, isChild)}
                    </td>

                    {/* Sticky Column 2: Ubicación */}
                    <td className={cn("sticky left-[100px] z-20 px-3 text-xs font-bold text-[#5a4838] uppercase border-r border-[#ddd0be] transition-colors", rowBg)}>
                      {row.zone}
                    </td>

                    {/* Sticky Column 3: Área Privativa / Fracción */}
                    <td className={cn("sticky left-[210px] z-20 px-3 border-r-2 border-[#ddd0be] shadow-[2px_0_5px_rgba(30,18,8,0.02)] transition-colors", rowBg)}>
                      <p className="font-bold text-[#2b1e12] leading-tight truncate">{row.areaLabel}</p>
                      <StatusBadge label={row.statusLabel} css={row.statusCss} />
                    </td>

                    {/* Cuotas Base Extraordinarias */}
                    <td className="px-2 border-r border-[#e8ddd0] text-center">{renderFinancialCards(row.baseFee)}</td>

                    {/* Saldo Actual Consolidado */}
                    <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8]/30 font-bold text-center">
                      {renderFinancialCards(row.totalBalance)}
                    </td>

                    {/* Monthly Cells (24 meses) */}
                    {row.monthlyCells.map((mc, idx) => (
                      <td key={`mc-ext-${idx}-${row.id}`} className="px-2 border-r border-[#e8ddd0] text-center">
                        {renderFinancialCards(mc)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>

            {/* TFOOT — Totales */}
            <tfoot>
              <tr className="border-t-2 border-[#c8b49a] bg-[#e0d5c8] font-bold text-[#2b1e12]">
                <td className="sticky left-0 z-20 border-r border-[#c8b49a] bg-[#e0d5c8] px-2 py-2 text-center text-xs">
                  —
                </td>
                <td className="sticky left-[100px] z-20 border-r border-[#c8b49a] bg-[#e0d5c8] px-3 py-2 text-xs uppercase font-bold text-[#5a4838]">
                  —
                </td>
                <td className="sticky left-[210px] z-20 border-r-2 border-[#c8b49a] bg-[#e0d5c8] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#2b1e12]">
                  TOTALES
                </td>

                <td className="px-2 border-r border-[#c8b49a] text-center">{renderFinancialCards(vm.totalsRow.baseFee)}</td>
                <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8] text-center">{renderFinancialCards(vm.totalsRow.totalBalance)}</td>

                {vm.totalsRow.monthlyCells.map((mc, idx) => (
                  <td key={`tot-ext-mc-${idx}`} className="px-2 border-r border-[#c8b49a] text-center">
                    {renderFinancialCards(mc)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="flex justify-between items-center py-4 px-2">
        <p className="text-[11px] font-bold text-[#7a5e44] uppercase tracking-widest">
          Cartera extraordinaria consolidada &middot; {vm.totalAreas} unidades en sistema
        </p>
      </div>
    </div>
  );
}
