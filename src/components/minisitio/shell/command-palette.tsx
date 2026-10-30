"use client";

/**
 * "Buscar o ir a…" (Ctrl/⌘ K), como el selector rápido de Slack: salta a cualquier pantalla,
 * propiedad o comercio sin recorrer el menú. Búsqueda sin acentos ni mayúsculas.
 *
 * Accesible: diálogo modal con un combobox y su listbox (aria-activedescendant); ↑/↓ para
 * moverse, Enter para abrir, Esc para cerrar; al cerrar el foco regresa a donde estaba.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CornerDownLeft, Plus, Search } from "lucide-react";
import { dialog, scrim } from "../motion";
import { ACCOUNT_ITEMS, type NavItem, type NavModel } from "./nav-config";

interface PaletteEntry {
  item: NavItem;
  group: string;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function buildEntries(model: NavModel): PaletteEntry[] {
  const entries: PaletteEntry[] = model.pinned.map((item) => ({ item, group: "Ir a" }));
  for (const section of model.sections) {
    for (const item of section.items) entries.push({ item, group: section.label });
  }
  for (const item of ACCOUNT_ITEMS) entries.push({ item, group: "Tu cuenta" });
  entries.push({
    item: { id: "nueva-solicitud", label: "Nueva solicitud", href: "/tickets?nueva=1", icon: Plus, keywords: "ticket reporte ayuda mantenimiento" },
    group: "Acciones",
  });
  return entries;
}

export function CommandPalette({
  open,
  onClose,
  model,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  model: NavModel;
  onSelect: (item: NavItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const listId = useId();

  const entries = useMemo(() => buildEntries(model), [model]);
  const results = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return entries;
    return entries.filter(({ item, group }) => {
      const haystack = normalize(`${item.label} ${item.detail ?? ""} ${group} ${item.keywords ?? ""}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [entries, query]);

  // Al abrir: limpiar, recordar el foco anterior y enfocar el campo. Al cerrar: devolverlo.
  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (restoreFocus.current) {
      restoreFocus.current.focus?.();
      restoreFocus.current = null;
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Mantener visible la opción activa.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onSelect(entry.item);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(results.length - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // El diálogo solo tiene el campo: el foco se queda dentro.
      e.preventDefault();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
          <motion.div {...scrim} className="absolute inset-0 bg-chrome-strong/40" onClick={onClose} aria-hidden />
          <motion.div
            {...dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[min(560px,76vh)] w-full max-w-[640px] flex-col overflow-hidden rounded-panel bg-surface shadow-16 ring-1 ring-black/5"
          >
            <h2 id={titleId} className="sr-only">
              Buscar o ir a
            </h2>
            <div className="flex items-center gap-3 border-b border-stroke-3 px-4">
              <Search className="h-[18px] w-[18px] shrink-0 text-fg-3" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
                placeholder="Buscar pantallas, propiedades, comercios…"
                className="h-14 min-w-0 flex-1 bg-transparent text-body-lg text-fg outline-none placeholder:text-fg-3 max-sm:text-[16px]"
              />
              <kbd className="hidden shrink-0 rounded-ctrl border border-stroke-2 px-1.5 py-0.5 text-caption text-fg-3 sm:inline">Esc</kbd>
            </div>

            <ul ref={listRef} id={listId} role="listbox" aria-label="Resultados" className="min-h-0 flex-1 overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-10 text-center text-body text-fg-3" role="presentation">
                  Sin resultados para «{query}».
                </li>
              )}
              {results.map((entry, index) => {
                const showGroup = index === 0 || results[index - 1].group !== entry.group;
                const Icon = entry.item.icon;
                const isActive = index === active;
                return (
                  <li key={`${entry.group}-${entry.item.id}`} role="presentation">
                    {showGroup && (
                      <div className="px-3 pt-3 pb-1 text-caption font-semibold text-fg-3 first:pt-1" role="presentation">
                        {entry.group}
                      </div>
                    )}
                    <div
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={isActive}
                      data-index={index}
                      onMouseMove={() => setActive(index)}
                      onClick={() => choose(entry)}
                      className={`flex h-10 cursor-pointer items-center gap-3 rounded-surface px-3 text-body ${
                        isActive ? "bg-brand text-white" : "text-fg"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-fg-3"}`} strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {entry.item.label}
                        {entry.item.detail && <span className={isActive ? "text-white/75" : "text-fg-3"}> · {entry.item.detail}</span>}
                      </span>
                      {entry.item.attention && (
                        <span className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-unread" : "bg-mention"}`} aria-hidden />
                      )}
                      {entry.item.external ? (
                        <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white/80" : "text-fg-3"}`} aria-hidden />
                      ) : (
                        isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-white/80" aria-hidden />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden items-center gap-4 border-t border-stroke-3 px-4 py-2 text-caption text-fg-3 sm:flex">
              <span>
                <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> para moverte
              </span>
              <span>
                <kbd className="font-sans">Enter</kbd> para abrir
              </span>
              <span className="ml-auto">
                <kbd className="font-sans">Ctrl</kbd> / <kbd className="font-sans">⌘</kbd> <kbd className="font-sans">K</kbd> en cualquier pantalla
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
