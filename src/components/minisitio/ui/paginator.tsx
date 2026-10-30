"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Variante de `@/components/ui/paginator` para paginación con estado de cliente: en vez de
 * hrefs recibe `onPageChange(page)`.
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
  const step =
    "inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-fg-2 outline-none transition-colors duration-100 hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/45 disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-stroke-2 bg-card px-3 py-2.5 sm:flex-row sm:px-4"
    >
      <p className="flex items-center gap-2 text-[13px] text-fg-3 tabular-nums">
        {totalRows !== undefined && (
          <span>
            <span className="font-semibold text-fg-2">{totalRows.toLocaleString("es-MX")}</span> {rowsLabel} ·{" "}
          </span>
        )}
        <span>
          Página <span className="font-semibold text-fg-2">{page}</span> de {totalPages}
        </span>
        {isPending && <Loader2 aria-label="Cargando" className="h-3.5 w-3.5 animate-spin text-brand" />}
      </p>

      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => navigate(page - 1)} disabled={!hasPrev || isPending} className={step}>
          <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {pageWindow(page, totalPages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="w-7 text-center text-[13px] text-fg-4">
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
                "h-9 min-w-9 rounded-lg px-2 text-[13px] font-medium tabular-nums outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-brand/45",
                item === page ? "bg-brand text-white shadow-[0_1px_2px_rgb(61_60_34/0.25)]" : "text-fg-2 hover:bg-surface-3 hover:text-fg",
              )}
            >
              {item}
            </button>
          ),
        )}

        <button type="button" onClick={() => navigate(page + 1)} disabled={!hasNext || isPending} className={step}>
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
