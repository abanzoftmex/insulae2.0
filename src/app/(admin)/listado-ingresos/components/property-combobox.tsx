"use client";

import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { Search, X, ChevronDown, Check, Building2, MapPin } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export type PropertyItem = {
  id: string;
  name: string;
  code?: string | null;
  zone?: string | null;
};

interface PropertyComboboxProps {
  properties: PropertyItem[];
  selectedId: string;
  onSelect: (propertyId: string, property: PropertyItem | null) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
  fallbackName?: string | null;
}

/**
 * Normaliza una cadena para búsquedas: minúsculas, sin acentos ni espacios redundantes.
 */
function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Obtiene la etiqueta amigable y los componentes de visualización de una propiedad.
 */
function getPropertyDisplay(prop: PropertyItem) {
  const code = (prop.code || "").trim();
  const name = (prop.name || "").trim();

  // Si name y code son idénticos o code está vacío
  if (!code || code.toLowerCase() === name.toLowerCase()) {
    return {
      primary: name || code,
      secondary: null,
      fullLabel: name || code,
    };
  }

  // Si ambos existen y son diferentes (ej: code = "VQ#005-010", name = "El Mesón 5")
  return {
    primary: code,
    secondary: name,
    fullLabel: `${code} · ${name}`,
  };
}

export function PropertyCombobox({
  properties,
  selectedId,
  onSelect,
  disabled = false,
  className,
  label = "Propiedad Vinculada",
  placeholder = "Buscar o seleccionar propiedad...",
  fallbackName = null,
}: PropertyComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const comboboxId = useId();

  // Buscar el objeto seleccionado actual
  const selectedProperty = useMemo(() => {
    if (!selectedId) return null;
    return properties.find((p) => p.id === selectedId) || null;
  }, [properties, selectedId]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Enfocar el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      // Pequeño timeout para asegurar que el input esté montado
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Filtrar propiedades conforme se escribe en el buscador
  const filteredProperties = useMemo(() => {
    const query = search.trim();
    if (!query) return properties;

    const queryNorm = normalizeSearch(query);
    const queryCompact = queryNorm.replace(/[^a-z0-9]/g, "");

    return properties.filter((prop) => {
      const nameNorm = normalizeSearch(prop.name || "");
      const codeNorm = normalizeSearch(prop.code || "");
      const zoneNorm = normalizeSearch(prop.zone || "");

      // 1. Coincidencia directa por nombre, código o zona (sin acentos, mayúsculas/minúsculas ignoradas)
      if (nameNorm.includes(queryNorm)) return true;
      if (codeNorm.includes(queryNorm)) return true;
      if (zoneNorm.includes(queryNorm)) return true;

      // 2. Coincidencia relajada ignorando caracteres especiales como "#", "-" o espacios (ej: "vq005" -> "VQ#005-010")
      if (queryCompact.length >= 2) {
        const nameCompact = nameNorm.replace(/[^a-z0-9]/g, "");
        const codeCompact = codeNorm.replace(/[^a-z0-9]/g, "");
        if (nameCompact.includes(queryCompact)) return true;
        if (codeCompact.includes(queryCompact)) return true;
      }

      return false;
    });
  }, [properties, search]);

  const handleSelect = (prop: PropertyItem | null) => {
    if (prop) {
      onSelect(prop.id, prop);
    } else {
      onSelect("", null);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect("", null);
  };

  // Texto a mostrar en el trigger cerrado
  const triggerDisplay = useMemo(() => {
    if (selectedProperty) {
      return getPropertyDisplay(selectedProperty).fullLabel;
    }
    if (selectedId && fallbackName) {
      return fallbackName;
    }
    return null;
  }, [selectedProperty, selectedId, fallbackName]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Label flotante superior */}
      {label && (
        <label
          htmlFor={comboboxId}
          className="absolute left-2.5 -top-1.5 px-1 bg-card text-[10px] font-bold uppercase tracking-widest text-brand-accent/70 pointer-events-none z-10"
        >
          {label}
        </label>
      )}

      {/* Botón trigger principal */}
      <button
        id={comboboxId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "h-9 w-full rounded-md border border-line bg-card px-3 text-[13px] font-medium text-left outline-none transition-all flex items-center justify-between gap-2",
          isOpen
            ? "border-brand ring-2 ring-brand-accent/30"
            : "hover:border-line/80 focus:border-brand focus:ring-2 focus:ring-brand-accent/30",
          disabled && "opacity-60 cursor-not-allowed bg-canvas/40"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {triggerDisplay ? (
            <>
              <Building2 className="h-3.5 w-3.5 text-brand shrink-0" />
              <span className="font-bold text-ink truncate">{triggerDisplay}</span>
            </>
          ) : (
            <span className="text-ink-soft/60 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-ink-soft/70">
          {triggerDisplay && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
              title="Quitar propiedad vinculada"
              className="p-1 hover:text-red-600 rounded hover:bg-canvas transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180 text-brand"
            )}
          />
        </div>
      </button>

      {/* Menú desplegable flotante con buscador integrado */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 bg-card border border-line rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
          style={{ minWidth: "100%" }}
        >
          {/* 1. Buscador dentro del menú desplegable */}
          <div className="p-2 border-b border-line/60 bg-canvas/40">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-brand shrink-0 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por clave o nombre (ej. VQ#005)..."
                className="w-full h-8 pl-8 pr-7 text-[12px] bg-card border border-line rounded-md outline-none focus:border-brand focus:ring-1 focus:ring-brand text-ink placeholder:text-ink-soft/50 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-ink-soft/60 hover:text-ink p-0.5 rounded"
                  title="Limpiar búsqueda"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Barra informativa y acción rápida */}
          <div className="px-3 py-1.5 bg-canvas/20 border-b border-line/30 flex items-center justify-between text-[10.5px] text-ink-soft font-semibold">
            <span>
              {filteredProperties.length}{" "}
              {filteredProperties.length === 1
                ? "propiedad disponible"
                : "propiedades disponibles"}
              {search.trim() ? ` (filtradas de ${properties.length})` : ""}
            </span>
            {selectedId && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-red-600 hover:text-red-700 hover:underline flex items-center gap-0.5"
              >
                <X className="h-2.5 w-2.5" /> Quitar selección
              </button>
            )}
          </div>

          {/* 3. Lista con scroll y espacio generoso */}
          <div
            ref={listRef}
            className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-line/20 overscroll-contain"
          >
            {/* Opción para desvincular propiedad */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full text-left px-3 py-2 text-[12px] font-medium transition-colors flex items-center justify-between gap-2",
                !selectedId
                  ? "bg-brand/10 text-brand font-bold border-l-2 border-brand"
                  : "text-ink-soft hover:bg-canvas hover:text-ink"
              )}
            >
              <span className="italic flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-line" />
                Sin propiedad vinculada (opcional)
              </span>
              {!selectedId && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
            </button>

            {/* Listado de propiedades */}
            {filteredProperties.length > 0 ? (
              filteredProperties.map((prop) => {
                const isSelected = prop.id === selectedId;
                const display = getPropertyDisplay(prop);

                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => handleSelect(prop)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center justify-between gap-2.5",
                      isSelected
                        ? "bg-brand/10 text-brand font-bold border-l-2 border-brand"
                        : "text-ink hover:bg-brand/5"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          "truncate font-bold tracking-tight",
                          isSelected ? "text-brand" : "text-ink"
                        )}
                      >
                        {display.primary}
                      </span>

                      {display.secondary && (
                        <span className="text-[11px] font-medium text-ink-soft truncate">
                          ({display.secondary})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {prop.zone && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-canvas border border-line/50 text-ink-soft">
                          <MapPin className="h-2.5 w-2.5 text-brand-accent/80" />
                          {prop.zone}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-brand shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-ink-soft space-y-1">
                <p className="text-[12px] font-bold text-ink">
                  No se encontraron propiedades
                </p>
                <p className="text-[11px] text-ink-soft/70">
                  No hay coincidencias para &ldquo;{search}&rdquo;. Revisa la clave o el nombre.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

