import React from "react";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";

import { getFeeReportUseCase, toExtraordinaryFeeReportListingVM } from "@/modules/fee-report";
import type { FeeReportCellVM } from "@/modules/fee-report";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-report-display",
});

const uiFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-report-ui",
});

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

  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);
  const pages: (number | "...")[] = [];

  if (start > 1) { pages.push(1); if (start > 2) pages.push("..."); }
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages) { if (end < totalPages - 1) pages.push("..."); pages.push(totalPages); }

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-1.5 py-4">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c8b49a] bg-white text-[#5a4030] transition hover:bg-[#f5ede0]"
          aria-label="Página anterior"
        >
          ‹
        </Link>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-[#8a6e58]">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-[13px] font-semibold transition ${p === page
                ? "border-[#7a4820] bg-[#7a4820] text-white shadow-sm"
                : "border-[#d0c0a8] bg-white text-[#5a4030] hover:bg-[#f5ede0]"
              }`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c8b49a] bg-white text-[#5a4030] transition hover:bg-[#f5ede0]"
          aria-label="Página siguiente"
        >
          ›
        </Link>
      )}
    </nav>
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
    <main
      className={`${displayFont.variable} ${uiFont.variable} relative isolate min-h-screen overflow-hidden bg-[#f0ebe1] font-[var(--font-report-ui)]`}
    >
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-20 h-96 w-96 rotate-[-15deg] rounded-[3rem] bg-[#0a4f6b]/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-32 h-80 w-96 rotate-12 rounded-[3rem] bg-[#b35c1c]/12 blur-3xl" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(80,60,40,0.14)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="relative mx-auto max-w-[1920px] px-4 pb-20 pt-8 sm:px-6">

        {/* ── HEADER ── */}
        <header className="mb-5 overflow-hidden rounded-[2rem] border border-[#c8b89e]/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,238,224,0.95)_100%)] p-6 shadow-[0_20px_48px_rgba(20,14,8,0.14)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-[#c8b098] bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b4c2e]">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Cuotas Extraordinarias
              </p>
              <h1 className="mt-2 font-[var(--font-report-display)] text-3xl leading-tight text-[#2b1e12] sm:text-4xl">
                {vm.title}
              </h1>
              <p className="mt-1.5 text-sm text-[#5e4a38]">
                {vm.subtitle} · Última actualización: <strong>{vm.lastUpdatedLabel}</strong>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-[#c8b49a] bg-white/80 px-4 py-2.5 text-right shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6045]">Total áreas</p>
                <p className="mt-0.5 text-2xl font-bold text-[#2b1e12]">{vm.totalAreas}</p>
              </div>
              <div className="rounded-2xl border border-[#c8b49a] bg-white/80 px-4 py-2.5 text-right shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6045]">Período</p>
                <p className="mt-0.5 text-lg font-bold text-[#2b1e12]">{primaryYear} – {secondaryYear}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#b0c8f5] bg-[#dce8fd] px-2.5 py-0.5 font-semibold text-[#1a3d8f]">
              <span className="rounded bg-[#1a3d8f] px-1 py-px text-[9px] text-white">P</span>
              Propietario
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#f5b0c8] bg-[#fddce8] px-2.5 py-0.5 font-semibold text-[#8f1a3d]">
              <span className="rounded bg-[#8f1a3d] px-1 py-px text-[9px] text-white">C</span>
              Comercio
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#b0e0b0] bg-[#e0f7e0] px-2.5 py-0.5 font-semibold text-[#1a6020]">
              Fondo verde = FAP (Fracción de Área Privativa)
            </span>
          </div>
        </header>

        {/* ── Paginador top ── */}
        <Paginator page={vm.page} totalPages={vm.totalPages} />

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
                      className="sticky left-0 top-0 z-40 min-w-[200px] border-b-2 border-r-2 border-[#c8b49a] bg-[#e0d5c8] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#5a4838]"
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
                        className="min-w-[120px] border-b border-[#d8c8b4] px-2 py-2 text-center"
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
                        <td className={`sticky left-0 z-10 min-w-[200px] border-r-2 border-[#ddd0be] px-3 py-2 ${stickyBg}`}>
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
        <Paginator page={vm.page} totalPages={vm.totalPages} />
      </div>
    </main>
  );
}
