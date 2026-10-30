"use client";

/**
 * Piezas de las pantallas de listado (propiedades, comercios…): buscador con su conteo,
 * estado vacío y botón principal. Mismas medidas en todo el portal.
 */
import type { LucideIcon } from "lucide-react";
import { Search, X } from "lucide-react";

/** Botón principal y secundario del contenido (36 px, radio 10). */
export const BUTTON = {
  primary:
    "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 active:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-stroke-2 bg-card px-4 text-[13.5px] font-semibold text-fg-2 outline-none transition-[background-color,border-color] duration-150 hover:border-stroke hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
} as const;

export function SearchInput({
  value,
  onChange,
  placeholder,
  resultCount,
  label = "Buscar",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Resultados con el filtro aplicado; se anuncia a lectores de pantalla. */
  resultCount?: number;
  label?: string;
}) {
  return (
    <div className="rounded-2xl border border-stroke-2 bg-card p-3 sm:p-4">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-fg-3" strokeWidth={2} />
        <input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              onChange("");
            }
          }}
          className="h-11 w-full rounded-xl border border-stroke-2 bg-surface-2 pl-11 pr-11 text-[14px] text-fg outline-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-fg-4 hover:border-stroke focus:border-brand/50 focus:bg-card focus:ring-[3px] focus:ring-brand/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-fg-3 outline-none transition-colors duration-100 hover:bg-surface-4 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/45"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
      {value.trim() && resultCount !== undefined && (
        <p className="mt-2.5 px-1 text-[12.5px] text-fg-3" role="status">
          <span className="font-semibold text-fg-2 tabular-nums">{resultCount}</span> {resultCount === 1 ? "resultado" : "resultados"} para «
          {value.trim()}»
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stroke-2 bg-card px-6 py-14 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3 text-fg-4">
        <Icon aria-hidden className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <h3 className="text-[16px] font-semibold text-fg">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-5 text-fg-3">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
