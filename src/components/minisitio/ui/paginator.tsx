"use client";

/**
 * Paginación de cliente compacta: "Anterior · 1 … 5 6 7 … 59 · Siguiente" (antes pintaba un botón
 * por página: 59 en la cartera de cuotas). La página actual va en olivo; el resto, como botones
 * chicos. `onPageChange(page)` en vez de hrefs.
 */
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { buttonClass } from "./button";

/** Páginas visibles: primera, última, la actual y sus vecinas, con "…" en los huecos. */
function ventana(page: number, total: number): (number | "…")[] {
  const set = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => set.add(p));
  const out: (number | "…")[] = [];
  let anterior = 0;
  for (const p of [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)) {
    if (p - anterior > 1) out.push("…");
    out.push(p);
    anterior = p;
  }
  return out;
}

const numero = new Intl.NumberFormat("es-MX");

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

  const ir = (siguiente: number) => {
    if (siguiente < 1 || siguiente > totalPages || siguiente === page) return;
    onPageChange?.(siguiente);
  };

  return (
    <nav aria-label="Paginación" className="flex flex-col items-center justify-between gap-3 py-2 sm:flex-row">
      <p className="flex items-center gap-2 text-caption text-fg-3 tabular-nums">
        {totalRows !== undefined && (
          <span>
            {numero.format(totalRows)} {rowsLabel} ·
          </span>
        )}
        <span>
          Página {page} de {totalPages}
        </span>
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-label="Cargando" />}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={() => ir(page - 1)} disabled={page <= 1 || isPending} className={buttonClass("ghost", "sm", "min-w-0 px-2")}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Anterior
        </button>
        {ventana(page, totalPages).map((p, index) =>
          p === "…" ? (
            <span key={`hueco-${index}`} aria-hidden className="w-6 text-center text-caption text-fg-4">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => ir(p)}
              disabled={isPending}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Página ${p}`}
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-ctrl px-1.5 text-[13px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                p === page ? "bg-brand text-white" : "text-fg-2 hover:bg-surface-3"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => ir(page + 1)} disabled={page >= totalPages || isPending} className={buttonClass("ghost", "sm", "min-w-0 px-2")}>
          Siguiente
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
