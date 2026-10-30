"use client";

/**
 * Buscador global del portal: el campo del encabezado y su paleta (Ctrl/⌘ K o "/").
 * Encuentra pantallas, propiedades, comercios, solicitudes, comunicados, documentos y
 * teléfonos del condómino, sin acentos ni mayúsculas y con la coincidencia resaltada.
 *
 * El índice llega de una acción de servidor la primera vez que se abre (o en cuanto el cursor
 * se acerca al campo) y se filtra en el navegador, así cada tecla responde al instante. Las
 * pantallas no esperan al índice: salen de la misma configuración que la barra lateral.
 *
 * Accesible: diálogo modal con combobox y listbox (aria-activedescendant); ↑/↓ para moverse,
 * Enter para abrir, Esc para cerrar; al cerrar, el foco vuelve a donde estaba.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Clock3,
  CornerDownLeft,
  FileText,
  Home,
  Landmark,
  Loader2,
  MailPlus,
  Megaphone,
  Phone,
  Search,
  Settings,
  X,
} from "lucide-react";
import { getSearchIndexAction, type SearchIndex } from "@/app/(minisitio)/minisitio/_actions/search";
import type { NavSection } from "./nav-config";
import { msPath } from "./paths";

interface Result {
  key: string;
  group: string;
  title: string;
  /** Segunda línea atenuada (clave, categoría, teléfono…). */
  detail?: string;
  /** Dato breve a la derecha (fecha, barrio, estado). */
  meta?: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
  /** Saldo vencido: punto teja junto al nombre. */
  attention?: boolean;
  /** Texto que también se busca pero no se muestra. */
  keywords?: string;
}

type Recent = Pick<Result, "key" | "group" | "title" | "detail" | "href" | "external">;

const GROUP_ORDER = ["Pantallas", "Mis Propiedades", "Mis Comercios", "Solicitudes", "Comunicados", "Documentos", "Teléfonos"];
const PER_GROUP = 6;
const INDEX_TTL_MS = 5 * 60 * 1000;
const RECENTS_KEY = "minisitio-busquedas-recientes";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const sinSuscripcion = () => () => {};

/** Minúsculas sin acentos, carácter por carácter (la posición i del texto normalizado es la
 *  posición i del original, para poder resaltar). */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const f = ch.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    out += f.length === 1 ? f : ch.toLowerCase().slice(0, 1) || " ";
  }
  return out;
}

const fecha = (iso: string | null) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
};

function buildStatic(sections: NavSection[]): Result[] {
  const out: Result[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      const entries = item.children?.length ? item.children : [item];
      for (const entry of entries) {
        out.push({
          key: `pantalla:${entry.name}`,
          group: "Pantallas",
          title: entry.name,
          // Pantallas en una sola línea: el módulo va a la derecha, como dato de contexto.
          meta: item.children?.length ? item.name : section.title,
          icon: entry.icon,
          href: entry.href!,
          external: entry.external,
          keywords: entry.keywords,
        });
      }
    }
  }
  out.push(
    {
      key: "pantalla:Mi Perfil",
      group: "Pantallas",
      title: "Mi Perfil",
      meta: "Tu cuenta",
      icon: Settings,
      href: msPath("/mi-perfil"),
      keywords: "cuenta datos fiscales factura correo contraseña asignaciones",
    },
    {
      key: "pantalla:Notificaciones",
      group: "Pantallas",
      title: "Notificaciones",
      meta: "Tu cuenta",
      icon: Bell,
      href: msPath("/notificaciones"),
      keywords: "avisos mensajes",
    },
  );
  return out;
}

function buildDynamic(index: SearchIndex): Result[] {
  return [
    ...index.propiedades.map((p) => ({
      key: `propiedad:${p.id}`,
      group: "Mis Propiedades",
      title: p.nombre,
      detail: p.clave || undefined,
      meta: p.zona,
      icon: Home,
      href: msPath(`/propiedades/${p.id}`),
      attention: p.vencido,
      keywords: "propiedad área privativa estado de cuenta",
    })),
    ...index.comercios.map((c) => ({
      key: `comercio:${c.id}`,
      group: "Mis Comercios",
      title: c.nombre,
      detail: c.area || undefined,
      icon: Landmark,
      href: msPath(`/arrendamientos/${c.id}`),
      attention: c.vencido,
      keywords: "comercio local arrendamiento estado de cuenta",
    })),
    ...index.solicitudes.map((s) => ({
      key: `solicitud:${s.id}`,
      group: "Solicitudes",
      title: s.titulo,
      detail: [s.estado, s.departamento].filter(Boolean).join(" · "),
      meta: fecha(s.fecha),
      icon: MailPlus,
      href: msPath(`/tickets?id=${encodeURIComponent(s.id)}`),
      keywords: "solicitud ticket reporte",
    })),
    ...index.comunicados.map((c) => ({
      key: `comunicado:${c.id}`,
      group: "Comunicados",
      title: c.titulo,
      detail: c.categoria,
      meta: fecha(c.fecha),
      icon: Megaphone,
      href: msPath(`/comunicados?id=${encodeURIComponent(c.id)}`),
      keywords: c.texto,
    })),
    ...index.documentos.map((d) => ({
      key: `documento:${d.id}`,
      group: "Documentos",
      title: d.nombre,
      detail: d.reglamento ? "Reglamento" : "Documento condominal",
      icon: d.reglamento ? BookOpen : FileText,
      href: d.url,
      external: true,
      keywords: "documento reglamento pdf",
    })),
    ...index.contactos.map((c) => ({
      key: `contacto:${c.id}`,
      group: "Teléfonos",
      title: c.titulo,
      detail: c.valor,
      meta: c.tipo,
      icon: Phone,
      href: msPath(`/campos-contacto?id=${encodeURIComponent(c.id)}`),
      keywords: "teléfono emergencia contacto",
    })),
  ];
}

interface Searchable {
  r: Result;
  title: string;
  rest: string;
}

const toSearchable = (r: Result): Searchable => ({
  r,
  title: fold(r.title),
  rest: fold(`${r.detail ?? ""} ${r.meta ?? ""} ${r.group} ${r.keywords ?? ""}`),
});

/** Puntúa una coincidencia: todas las palabras deben aparecer; pesa más el inicio del título. */
function score({ title, rest }: Searchable, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    if (title.startsWith(term)) total += 4;
    else if (title.includes(` ${term}`)) total += 3;
    else if (title.includes(term)) total += 2;
    else if (rest.includes(term)) total += 0.5;
    else return 0;
  }
  return total;
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  // Por puntos de código, igual que fold(): la posición i coincide en los dos.
  const chars = Array.from(text);
  const folded = Array.from(fold(text));
  const haystack = folded.join("");
  const marks = new Array<boolean>(chars.length).fill(false);
  for (const term of terms) {
    let from = haystack.indexOf(term);
    while (from !== -1) {
      for (let i = from; i < from + term.length; i++) marks[i] = true;
      from = haystack.indexOf(term, from + term.length);
    }
  }
  const parts: { text: string; hit: boolean }[] = [];
  chars.forEach((ch, i) => {
    const last = parts[parts.length - 1];
    if (last && last.hit === marks[i]) last.text += ch;
    else parts.push({ text: ch, hit: marks[i] });
  });
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-[2px] bg-brand-mint/80 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function readRecents(): Recent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const list = raw ? (JSON.parse(raw) as Recent[]) : [];
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(result: Result) {
  try {
    const entry: Recent = { key: result.key, group: result.group, title: result.title, detail: result.detail, href: result.href, external: result.external };
    const next = [entry, ...readRecents().filter((r) => r.key !== result.key)].slice(0, 5);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento (modo privado): simplemente no hay recientes.
  }
}

/** Cada grupo con la posición de su primera fila en la lista plana (para ↑/↓ y los ids). */
function withOffsets<G extends { items: Result[] }>(groups: G[]) {
  let offset = 0;
  const out = groups.map((g) => {
    const withOffset = { ...g, offset };
    offset += g.items.length;
    return withOffset;
  });
  return { groups: out, flat: out.flatMap((g) => g.items) };
}

const ICON_BY_GROUP: Record<string, LucideIcon> = {
  "Mis Propiedades": Home,
  "Mis Comercios": Landmark,
  Solicitudes: MailPlus,
  Comunicados: Megaphone,
  Documentos: FileText,
  Teléfonos: Phone,
};

export function GlobalSearch({ sections }: { sections: NavSection[] }) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const isMac = useSyncExternalStore(
    sinSuscripcion,
    () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent),
    () => true,
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [recents, setRecents] = useState<Recent[]>([]);
  const loadedAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const listId = useId();

  const loadIndex = useCallback(async (force = false) => {
    if (!force && (status === "loading" || Date.now() - loadedAt.current < INDEX_TTL_MS)) return;
    setStatus("loading");
    try {
      const data = await getSearchIndexAction();
      loadedAt.current = Date.now();
      setIndex(data);
      setStatus("idle");
    } catch (error) {
      console.error("[minisitio] buscador:", error);
      setStatus("error");
    }
  }, [status]);

  const openPalette = useCallback(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    setRecents(readRecents());
    setOpen(true);
    void loadIndex();
  }, [loadIndex]);

  const close = useCallback(() => setOpen(false), []);

  // Ctrl/⌘ K desde cualquier pantalla; "/" cuando no se está escribiendo en un campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else openPalette();
        return;
      }
      if (e.key === "/" && !open && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPalette, close]);

  // Mientras está abierta, la página de atrás no se desplaza; al cerrar, el foco regresa.
  useEffect(() => {
    if (!open) return;
    const barra = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const staticResults = useMemo(() => buildStatic(sections), [sections]);
  const searchable = useMemo(
    () => [...staticResults, ...(index ? buildDynamic(index) : [])].map(toSearchable),
    [staticResults, index],
  );
  const terms = useMemo(() => fold(query).split(/\s+/).filter(Boolean), [query]);

  /** Grupos a pintar y la lista plana en el mismo orden (para ↑/↓). */
  const { groups, flat } = useMemo(() => {
    if (terms.length === 0) {
      const recentResults: Result[] = recents.map((r) => ({
        ...r,
        key: `reciente:${r.key}`,
        group: "Recientes",
        icon: r.group === "Pantallas" ? (staticResults.find((s) => s.key === r.key)?.icon ?? Clock3) : (ICON_BY_GROUP[r.group] ?? Clock3),
        detail: r.detail ? `${r.group === "Pantallas" ? "" : `${r.group} · `}${r.detail}` : r.group,
      }));
      const g = [
        ...(recentResults.length ? [{ name: "Recientes", total: recentResults.length, items: recentResults }] : []),
        { name: "Ir a", total: staticResults.length, items: staticResults },
      ];
      return withOffsets(g);
    }
    const scored = searchable.map((x) => ({ r: x.r, s: score(x, terms) })).filter((x) => x.s > 0);
    const byGroup = new Map<string, { r: Result; s: number }[]>();
    for (const x of scored) byGroup.set(x.r.group, [...(byGroup.get(x.r.group) ?? []), x]);
    const g = [...byGroup.entries()]
      .map(([name, list]) => {
        list.sort((a, b) => b.s - a.s || a.r.title.localeCompare(b.r.title, "es"));
        return { name, total: list.length, best: list[0].s, items: list.slice(0, PER_GROUP).map((x) => x.r) };
      })
      // El grupo con la mejor coincidencia sube; a igual puntaje, el orden de siempre.
      .sort((a, b) => b.best - a.best || GROUP_ORDER.indexOf(a.name) - GROUP_ORDER.indexOf(b.name));
    return withOffsets(g);
  }, [terms, recents, staticResults, searchable]);

  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));

  // La opción activa siempre a la vista.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    const original = result.key.startsWith("reciente:") ? { ...result, key: result.key.slice(9) } : result;
    const recent = recents.find((r) => `reciente:${r.key}` === result.key);
    saveRecent(recent ? { ...original, group: recent.group, detail: recent.detail } : original);
    setOpen(false);
    if (result.external) window.open(result.href, "_blank", "noopener,noreferrer");
    else router.push(result.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = flat.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(n ? (activeIndex + 1) % n : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(n ? (activeIndex - 1 + n) % n : 0);
    } else if (e.key === "Home" && e.ctrlKey) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && e.ctrlKey) {
      e.preventDefault();
      setActive(Math.max(n - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flat[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // El diálogo solo tiene el campo y el botón de cerrar del celular: el foco se queda dentro.
      e.preventDefault();
    }
  };

  const shortcut = isMac ? "⌘K" : "Ctrl K";

  return (
    <>
      {/* Campo del encabezado (desde 640 px) y lupa en el celular */}
      <button
        type="button"
        onClick={openPalette}
        onPointerEnter={() => void loadIndex()}
        onFocus={() => void loadIndex()}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K /"
        className="group hidden h-10 w-[clamp(220px,28vw,340px)] shrink-0 items-center gap-2.5 rounded-xl border border-stroke-2 bg-surface-2 pl-3 pr-2 text-left text-[14px] text-fg-3 outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-stroke hover:bg-card hover:shadow-[0_1px_2px_rgb(61_60_34/0.06)] focus-visible:border-brand/50 focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-brand/15 sm:flex"
      >
        <Search aria-hidden className="h-4 w-4 shrink-0 text-fg-3 transition-colors duration-150 group-hover:text-brand" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate">Buscar en el portal…</span>
        <kbd className="hidden shrink-0 rounded-md border border-stroke-2 bg-card px-1.5 py-0.5 font-sans text-[11.5px] font-medium leading-4 text-fg-3 shadow-[0_1px_0_rgb(0_0_0/0.04)] md:inline">
          {shortcut}
        </kbd>
      </button>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Buscar en el portal"
        aria-haspopup="dialog"
        className="-mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft outline-none transition-colors duration-150 hover:bg-canvas-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95 sm:hidden"
      >
        <Search className="h-5 w-5" strokeWidth={2} />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[80] flex items-start justify-center sm:px-4 sm:pt-[12vh]" onKeyDown={onKeyDown}>
                <motion.div
                  aria-hidden
                  className="absolute inset-0 bg-brand-deep/35 backdrop-blur-[3px]"
                  onClick={close}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.18, ease: "linear" } }}
                  exit={{ opacity: 0, transition: { duration: 0.14, ease: "linear" } }}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  className="relative flex h-full w-full flex-col overflow-hidden bg-card shadow-[0_0_0_1px_rgb(61_60_34/0.08),0_24px_64px_-12px_rgb(61_60_34/0.4),0_8px_20px_-8px_rgb(61_60_34/0.18)] sm:h-auto sm:max-h-[min(600px,76vh)] sm:max-w-[640px] sm:rounded-2xl"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: reduce ? 0.12 : 0.2, ease: EASE_OUT } }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, scale: 0.98, y: -4, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
                >
                  <h2 id={titleId} className="sr-only">
                    Buscar en el portal
                  </h2>

                  <div className="flex shrink-0 items-center gap-3 border-b border-stroke-3 px-4 sm:px-5">
                    {status === "loading" ? (
                      <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-brand" strokeWidth={2} />
                    ) : (
                      <Search aria-hidden className="h-5 w-5 shrink-0 text-brand" strokeWidth={2} />
                    )}
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(0);
                      }}
                      role="combobox"
                      aria-expanded="true"
                      aria-controls={listId}
                      aria-autocomplete="list"
                      aria-activedescendant={flat[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                      placeholder="Busca propiedades, comunicados, teléfonos…"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-4 sm:h-16 sm:text-[17px]"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setActive(0);
                          inputRef.current?.focus();
                        }}
                        aria-label="Borrar búsqueda"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-3 outline-none transition-colors duration-100 hover:bg-surface-4 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/45"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={close}
                      className="hidden shrink-0 rounded-md border border-stroke-2 px-1.5 py-0.5 text-[11.5px] font-medium leading-4 text-fg-3 outline-none transition-colors duration-100 hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/45 sm:block"
                    >
                      Esc
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="-mr-1 shrink-0 rounded-lg px-2 py-1.5 text-[15px] font-medium text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/45 sm:hidden"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-label="Resultados"
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 scrollbar-slim"
                  >
                    {groups.map((group) => (
                      <div key={group.name} role="group" aria-label={group.name}>
                        <div className="flex items-baseline justify-between px-3 pb-1.5 pt-3.5" aria-hidden>
                          <span className="text-[12px] font-semibold text-fg-3">{group.name}</span>
                          {terms.length > 0 && group.total > group.items.length && (
                            <span className="text-[12px] text-fg-4 tabular-nums">
                              {group.items.length} de {group.total}
                            </span>
                          )}
                        </div>
                        {group.items.map((result, j) => {
                          const i = group.offset + j;
                          const isActive = i === activeIndex;
                          const Icon = result.icon;
                          return (
                            <div
                              key={result.key}
                              id={`${listId}-${i}`}
                              role="option"
                              aria-selected={isActive}
                              data-index={i}
                              onPointerMove={() => i !== activeIndex && setActive(i)}
                              onClick={() => choose(result)}
                              className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2"
                            >
                              {isActive && (
                                <motion.span
                                  layoutId="search-active"
                                  aria-hidden
                                  className="absolute inset-0 bg-nav"
                                  style={{ borderRadius: 12, boxShadow: "inset 0 0 0 1px rgb(61 60 34 / 0.06)" }}
                                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 700, damping: 50, mass: 0.6 }}
                                />
                              )}
                              <Icon
                                aria-hidden
                                className={`relative h-[18px] w-[18px] shrink-0 transition-colors duration-100 ${isActive ? "text-brand-accent" : "text-fg-3"}`}
                                strokeWidth={1.75}
                              />
                              <span className="relative min-w-0 flex-1">
                                <span className={`flex items-center gap-1.5 text-[14px] leading-5 ${isActive ? "text-brand-deep" : "text-fg"}`}>
                                  <span className="truncate font-medium">
                                    <Highlight text={result.title} terms={terms} />
                                  </span>
                                  {result.attention && (
                                    <>
                                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                                      <span className="sr-only">(con saldo vencido)</span>
                                    </>
                                  )}
                                </span>
                                {result.detail && (
                                  <span className="block truncate text-[12.5px] leading-[18px] text-fg-3">
                                    <Highlight text={result.detail} terms={terms} />
                                  </span>
                                )}
                              </span>
                              {result.meta && (
                                <span className="relative hidden shrink-0 text-[12px] text-fg-4 tabular-nums sm:block">{result.meta}</span>
                              )}
                              {result.external ? (
                                <ArrowUpRight aria-hidden className={`relative h-4 w-4 shrink-0 ${isActive ? "text-brand" : "text-fg-4"}`} />
                              ) : (
                                <CornerDownLeft
                                  aria-hidden
                                  className={`relative h-4 w-4 shrink-0 text-brand transition-opacity duration-100 ${isActive ? "opacity-100" : "opacity-0"}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {terms.length > 0 && flat.length === 0 && status !== "loading" && (
                      <div className="px-6 py-12 text-center" role="presentation">
                        <p className="text-[15px] font-semibold text-fg">Sin resultados para «{query.trim()}»</p>
                        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-5 text-fg-3">
                          Prueba con el nombre de una propiedad, la clave de un lote, el título de un comunicado o un teléfono.
                        </p>
                      </div>
                    )}
                    {terms.length > 0 && status === "loading" && !index && (
                      <p className="flex items-center gap-2 px-3 py-3 text-[13px] text-fg-3" role="status">
                        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Buscando en tus propiedades, comunicados y documentos…
                      </p>
                    )}
                    {status === "error" && (
                      <div className="mx-1 mt-2 flex items-center justify-between gap-3 rounded-xl bg-critical-bg px-3 py-2.5 text-[13px] text-overdue" role="alert">
                        <span>No se pudieron cargar tus datos; por ahora solo se buscan pantallas.</span>
                        <button
                          type="button"
                          onClick={() => void loadIndex(true)}
                          className="shrink-0 rounded-md px-2 py-1 font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-overdue/40"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="hidden shrink-0 items-center gap-4 border-t border-stroke-3 bg-surface-2 px-5 py-2.5 text-[12px] text-fg-3 sm:flex">
                    <span className="flex items-center gap-1.5">
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd> navegar
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Kbd>↵</Kbd> abrir
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Kbd>Esc</Kbd> cerrar
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <Kbd>{shortcut}</Kbd> o <Kbd>/</Kbd> desde cualquier pantalla
                    </span>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-stroke-2 bg-card px-1 font-sans text-[11px] font-medium leading-none text-fg-3 shadow-[0_1px_0_rgb(0_0_0/0.04)]">
      {children}
    </kbd>
  );
}
