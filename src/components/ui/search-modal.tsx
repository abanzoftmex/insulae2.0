"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search, X, ArrowRight, Home, Users, MapPin, Ticket,
  PieChart, FileText, BookOpen, Settings, ClipboardList,
  AlertCircle, TrendingUp, TrendingDown, LayoutGrid, Database,
  Loader2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { globalSearch, type SearchResultItem } from "@/app/actions/global-search";

// ─── Quick nav links ──────────────────────────────────────────────────────────

type NavLink = { label: string; href: string; icon: LucideIcon; category: string };

const NAV_LINKS: NavLink[] = [
  { label: "Inicio",             href: "/",                                icon: Home,          category: "Gestión" },
  { label: "Condominio",         href: "/condominio",                      icon: Settings,      category: "Gestión" },
  { label: "Directorio",         href: "/directorio",                      icon: BookOpen,      category: "Gestión" },
  { label: "Contactos",          href: "/contactos",                       icon: Users,         category: "Gestión" },
  { label: "Documentos",         href: "/reglamentos",                     icon: FileText,      category: "Gestión" },
  { label: "Áreas Privativas",   href: "/areas-privativas",                icon: MapPin,        category: "Operación" },
  { label: "Tickets",            href: "/tickets",                         icon: Ticket,        category: "Atención" },
  { label: "Notificaciones",     href: "/notificaciones",                  icon: AlertCircle,   category: "Atención" },
  { label: "Resumen Financiero", href: "/resumen-financiero",              icon: PieChart,      category: "Financiero" },
  { label: "Ingresos",           href: "/listado-ingresos",                icon: TrendingUp,    category: "Financiero" },
  { label: "Gastos",             href: "/listado-gastos",                  icon: TrendingDown,  category: "Financiero" },
  { label: "Presupuestos",       href: "/presupuestos",                    icon: ClipboardList, category: "Financiero" },
];

// ─── Icon map for data results ─────────────────────────────────────────────────

const TYPE_ICON: Record<SearchResultItem["type"], LucideIcon> = {
  area:     MapPin,
  resident: Users,
  ticket:   Ticket,
  expense:  TrendingDown,
  income:   TrendingUp,
  contact:  BookOpen,
};

const TYPE_COLOR: Record<SearchResultItem["type"], string> = {
  area:     "text-blue-500",
  resident: "text-violet-500",
  ticket:   "text-orange-500",
  expense:  "text-danger",
  income:   "text-brand-accent",
  contact:  "text-brand",
};

// ─── Component ────────────────────────────────────────────────────────────────

type Mode = "nav" | "data";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery]           = useState("");
  const [mode, setMode]             = useState<Mode>("nav");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataResults, setDataResults] = useState<SearchResultItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      setQuery("");
      setDataResults([]);
      setActiveIndex(0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Debounced data search
  useEffect(() => {
    if (mode !== "data") return;
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim() || query.trim().length < 2) {
      setDataResults([]);
      return;
    }
    debounce.current = setTimeout(() => {
      startTransition(async () => {
        const results = await globalSearch(query);
        setDataResults(results);
      });
    }, 280);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, mode]);

  // Nav results (client-filtered)
  const navResults = query.trim()
    ? NAV_LINKS.filter(
        (l) =>
          l.label.toLowerCase().includes(query.toLowerCase()) ||
          l.category.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_LINKS;

  const items = mode === "nav" ? navResults : dataResults;

  useEffect(() => { setActiveIndex(0); }, [query, mode]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const item = items[activeIndex];
        if (item) { window.location.href = item.href; onClose(); }
      } else if (e.key === "Tab") {
        e.preventDefault();
        setMode((m) => (m === "nav" ? "data" : "nav"));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose, items, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  const showEmpty = mode === "data" && query.trim().length >= 2 && !isPending && dataResults.length === 0;
  const showHint  = mode === "data" && query.trim().length < 2;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[540px] mx-4 bg-card rounded-card overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)" }}
      >
        {/* Input + mode switch */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-line">
          {isPending ? (
            <Loader2
              style={{ width: 15, height: 15 }}
              className="shrink-0 text-brand-accent animate-spin"
            />
          ) : (
            <Search
              style={{ width: 15, height: 15 }}
              className="shrink-0 text-ink-soft"
              strokeWidth={1.5}
            />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder={mode === "nav" ? "Buscar módulos..." : "Buscar en todos los datos..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-[14px] text-ink placeholder:text-ink-soft/40 bg-transparent outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 text-ink-soft hover:text-ink transition-standard"
              aria-label="Limpiar"
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}

          {/* Mode toggle */}
          <div className="flex items-center shrink-0 rounded-lg border border-line overflow-hidden text-[11px] font-medium">
            <button
              onClick={() => setMode("nav")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 transition-standard",
                mode === "nav"
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:text-ink hover:bg-canvas"
              )}
              aria-label="Buscar módulos"
              title="Módulos (Tab)"
            >
              <LayoutGrid style={{ width: 11, height: 11 }} strokeWidth={1.5} />
              <span className="hidden sm:inline">Módulos</span>
            </button>
            <button
              onClick={() => setMode("data")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 transition-standard",
                mode === "data"
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:text-ink hover:bg-canvas"
              )}
              aria-label="Buscar datos"
              title="Datos (Tab)"
            >
              <Database style={{ width: 11, height: 11 }} strokeWidth={1.5} />
              <span className="hidden sm:inline">Datos</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="py-1.5 max-h-[340px] overflow-y-auto">

          {/* Hint for data mode with short query */}
          {showHint && (
            <div className="flex flex-col items-center py-8 gap-1.5">
              <Database style={{ width: 18, height: 18 }} className="text-ink-soft/20" strokeWidth={1.5} />
              <p className="text-[12px] text-ink-soft/50">Escribe al menos 2 caracteres para buscar en los datos</p>
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="flex flex-col items-center py-8 gap-1">
              <p className="text-[13px] font-medium text-ink-soft">Sin resultados para &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-ink-soft/40">Intenta con otro término</p>
            </div>
          )}

          {/* Nav items */}
          {mode === "nav" && navResults.length > 0 && (
            <>
              <p className="px-4 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-soft/40">
                {query.trim() ? "Módulos" : "Acceso rápido"}
              </p>
              {navResults.map((item, i) => (
                <Link
                  key={item.href + i}
                  href={item.href}
                  data-idx={i}
                  onClick={onClose}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 transition-standard group",
                    i === activeIndex ? "bg-canvas" : "hover:bg-canvas"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 flex items-center justify-center rounded-lg transition-standard",
                      i === activeIndex ? "bg-brand-mint/30 text-brand" : "bg-canvas-2 text-ink-soft"
                    )}
                    style={{ width: 28, height: 28 }}
                  >
                    <item.icon style={{ width: 13, height: 13 }} strokeWidth={1.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{item.label}</p>
                    <p className="text-[11px] text-ink-soft/50">{item.category}</p>
                  </div>
                  <ArrowRight
                    style={{ width: 11, height: 11 }}
                    className={cn(
                      "shrink-0 transition-standard",
                      i === activeIndex ? "text-brand-accent" : "text-ink-soft/20"
                    )}
                  />
                </Link>
              ))}
            </>
          )}

          {/* Data results grouped by category */}
          {mode === "data" && dataResults.length > 0 && (() => {
            const groups = dataResults.reduce<Record<string, SearchResultItem[]>>((acc, r) => {
              (acc[r.category] ??= []).push(r);
              return acc;
            }, {});
            let globalIdx = 0;
            return Object.entries(groups).map(([cat, items]) => (
              <div key={cat}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-soft/40">
                  {cat}
                </p>
                {items.map((item) => {
                  const idx = globalIdx++;
                  const Icon = TYPE_ICON[item.type];
                  const colorClass = TYPE_COLOR[item.type];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      data-idx={idx}
                      onClick={onClose}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 transition-standard",
                        idx === activeIndex ? "bg-canvas" : "hover:bg-canvas"
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 flex items-center justify-center rounded-lg bg-canvas-2",
                          colorClass
                        )}
                        style={{ width: 28, height: 28 }}
                      >
                        <Icon style={{ width: 13, height: 13 }} strokeWidth={1.5} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">{item.label}</p>
                        {item.sublabel && (
                          <p className="text-[11px] text-ink-soft/50 truncate">{item.sublabel}</p>
                        )}
                      </div>
                      <ArrowRight
                        style={{ width: 11, height: 11 }}
                        className={cn(
                          "shrink-0 transition-standard",
                          idx === activeIndex ? "text-brand-accent" : "text-ink-soft/20"
                        )}
                      />
                    </Link>
                  );
                })}
              </div>
            ));
          })()}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-4 py-2 flex items-center gap-4">
          {[
            { keys: "↑↓", label: "navegar" },
            { keys: "↵",  label: "abrir" },
            { keys: "Tab", label: "cambiar modo" },
            { keys: "ESC", label: "cerrar" },
          ].map(({ keys, label }) => (
            <span key={label} className="flex items-center gap-1 text-[11px] text-ink-soft/35">
              <kbd className="inline-flex items-center px-1 py-px rounded border border-line text-[10px] font-medium">
                {keys}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
