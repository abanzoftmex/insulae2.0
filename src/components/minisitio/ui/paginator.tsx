"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Variante de `@/components/ui/paginator` para paginación con estado de cliente: en vez de
 * hrefs recibe `onPageChange(page)`. Se ve igual que el del panel.
 *
 * Muestra una ventana de páginas (1 … 5 6 [7] 8 9 … 59) en vez de todas: con 59 páginas el
 * paginador ocupaba tres renglones de círculos.
 */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2]);
  // Cerca de los extremos se completan cinco números para que el ancho no salte.
  if (page <= 3) [2, 3, 4, 5].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(p - sorted[i - 1] === 2 ? p - 1 : "gap");
    out.push(p);
  });
  return out;
}

export function Paginator({
  page,
  totalPages,
  totalRows,
  onPageChange,
  isPending = false,
  rowsLabel = "unidades",
}: {
  page: number;
  totalPages: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  isPending?: boolean;
  rowsLabel?: string;
}) {
  if (totalPages <= 1) return null;

  const navigate = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    onPageChange?.(nextPage);
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  // Mismas clases que el paginador del panel (`@/components/ui/paginator`).
  const step =
    "flex items-center gap-1 h-8 px-2.5 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors outline-none hover:bg-[#5a4838] hover:text-white hover:border-[#5a4838] focus-visible:ring-2 focus-visible:ring-brand-accent disabled:opacity-30 disabled:pointer-events-none";

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2 bg-[#faf6f0]/30 rounded-2xl border border-line/30"
    >
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 tabular-nums">
          {totalRows !== undefined && (
            <span>
              {totalRows.toLocaleString("es-MX")} {rowsLabel} &middot;{" "}
            </span>
          )}
          <span>
            página {page} de {totalPages}
          </span>
        </p>
        {isPending && <Loader2 aria-label="Cargando" className="h-3.5 w-3.5 animate-spin text-brand" />}
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        <button type="button" onClick={() => navigate(page - 1)} disabled={!hasPrev || isPending} className={step}>
          <ChevronLeft aria-hidden className="h-3.5 w-3.5" /> Ant.
        </button>

        {pageWindow(page, totalPages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="w-6 text-center text-[10px] font-bold text-ink-soft/70">
              …
            </span>
          ) : (
            <button
              type="button"
              key={`page-${item}`}
              onClick={() => navigate(item)}
              disabled={isPending}
              aria-current={item === page ? "page" : undefined}
              aria-label={`Página ${item}`}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-full border text-[10px] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                item === page
                  ? "bg-[#5a4838] border-[#5a4838] text-white shadow-sm"
                  : "bg-white border-line text-ink hover:bg-[#5a4838]/10 hover:text-[#5a4838] hover:border-[#5a4838]/30",
              )}
            >
              {item}
            </button>
          ),
        )}

        <button type="button" onClick={() => navigate(page + 1)} disabled={!hasNext || isPending} className={step}>
          Sig. <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}
