"use client";

/** Buscador de lista: 32 px, lupa a la izquierda y botón para limpiar cuando hay texto. */
import { Search, X } from "lucide-react";
import { fieldClass } from "./field";

export function SearchField({
  value,
  onChange,
  label,
  placeholder = label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Para lectores de pantalla (p. ej. "Buscar unidad"). */
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        className={`${fieldClass} h-8 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-1 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-ctrl text-fg-3 outline-none hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
