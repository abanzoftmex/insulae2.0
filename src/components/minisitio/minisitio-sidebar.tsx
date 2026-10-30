"use client";

/**
 * Barra lateral del portal: el rail "pergamino" con los módulos del condómino (distribución
 * aprobada en f7953bc), pulido al detalle.
 *
 * Geometría: la columna de íconos no se mueve al colapsar. Canaleta de 12 px + pared del
 * módulo de 4 px + sangría del ítem de 9 px ponen el ícono de 18 px en x = 25…43; su centro
 * (34) es el centro del rail colapsado de 68 px. Al plegar solo se recortan y se desvanecen
 * las etiquetas: nada cambia de lugar.
 *
 * Movimiento: el ítem activo es una tarjeta blanca con su marcador que se desliza al destino
 * nuevo (layoutId de framer-motion, resorte sin rebote). El hover aclara el ítem hacia ese
 * blanco. Con "reducir movimiento" todo cambia sin desplazarse.
 *
 * Color: cada módulo lleva uno de los colores de la ilustración de Val'Quirico (ver
 * `NavTone` en nav-config.ts). Se ve en la marca junto al título del módulo, en el ícono al
 * pasar el cursor y en el ícono y el marcador del activo; en reposo los íconos son neutros.
 * Al pie, sobre la cuenta, el pueblo (la misma ilustración de la ayuda de Bienvenida).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion, type Transition } from "framer-motion";
import { ArrowUpRight, ChevronDown, ChevronLeft, LogOut, Settings, X } from "lucide-react";
import type { NavEntry, NavSection, NavTone } from "./nav-config";
import { Tooltip } from "./tooltip";
import { msPath } from "./paths";
import { ValquiricoVista } from "./valquirico-art";

export const RAIL_EXPANDED = 268;
export const RAIL_COLLAPSED = 68;
const BRAND_HEIGHT = { expanded: 96, collapsed: 64 };

/** Casi crítico (ζ ≈ 0.97): llega en ~250 ms sin pasarse de largo. */
const SLIDE: Transition = { type: "spring", stiffness: 520, damping: 42, mass: 0.9 };
const INSTANT: Transition = { duration: 0 };

const sinSuscripcion = () => () => {};

/** Clases por color de módulo (cadenas completas para que Tailwind las genere). */
const TONE: Record<NavTone, { dot: string; icon: string; hover: string; mark: string }> = {
  olivo: { dot: "bg-brand", icon: "text-brand", hover: "group-hover:text-brand", mark: "bg-brand-accent" },
  teja: { dot: "bg-mention", icon: "text-terracotta", hover: "group-hover:text-terracotta", mark: "bg-mention" },
  ocre: { dot: "bg-brand-accent", icon: "text-warning", hover: "group-hover:text-warning", mark: "bg-brand-accent" },
  verde: { dot: "bg-success", icon: "text-success", hover: "group-hover:text-success", mark: "bg-success" },
  vino: { dot: "bg-vino", icon: "text-vino", hover: "group-hover:text-vino", mark: "bg-vino" },
};

/** Fila del rail: base común de enlaces y botones. */
const ROW =
  "group relative flex w-full items-center gap-2.5 rounded-lg pl-[9px] pr-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/45";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VQ";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : (parts[0][1] ?? "");
  return (first + last).toUpperCase();
}

/** Tarjeta blanca + marcador del ítem activo (dorado en Inicio, el color del módulo en los demás). `markLeft` lo deja a ras de la pared del
 *  módulo (-4) o sobre la guía del submenú (-12). */
function ActivePill({ reduce, markLeft = -4, tone = "olivo" }: { reduce: boolean; markLeft?: number; tone?: NavTone }) {
  const transition = reduce ? INSTANT : SLIDE;
  return (
    <>
      <motion.span
        layoutId="rail-active"
        aria-hidden
        className="absolute inset-0 bg-card"
        // Radio y sombra en `style` para que framer corrija su escala durante el deslizamiento.
        style={{ borderRadius: 8, boxShadow: "var(--shadow-nav-item)" }}
        transition={transition}
      />
      <motion.span
        layoutId="rail-mark"
        aria-hidden
        className={`absolute h-4 w-[3px] transition-colors duration-200 ${TONE[tone].mark}`}
        style={{ left: markLeft, top: "calc(50% - 8px)", borderRadius: "0 3px 3px 0" }}
        transition={transition}
      />
    </>
  );
}

/** Aclara el ítem hacia el blanco del activo; entra rápido y sale suave. */
function HoverWash() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 rounded-lg bg-white/0 transition-colors duration-200 ease-out group-hover:bg-white/55 group-hover:duration-75 group-active:bg-white/80"
    />
  );
}

/** Etiqueta que se recorta y se desvanece con el rail. */
function RailLabel({ collapsed, className = "", children }: { collapsed: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`relative min-w-0 flex-1 truncate transition-opacity ${
        collapsed ? "opacity-0 duration-100" : "opacity-100 delay-75 duration-200"
      } ${className}`}
    >
      {children}
    </span>
  );
}

function NavLink({
  item,
  collapsed,
  reduce,
  tone = "olivo",
  sub = false,
}: {
  item: NavEntry;
  collapsed: boolean;
  reduce: boolean;
  tone?: NavTone;
  sub?: boolean;
}) {
  const Icon = item.icon;
  const t = TONE[tone];
  const active = item.current;
  const external = item.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (sub) {
    return (
      <Link
        href={item.href!}
        aria-current={active ? "page" : undefined}
        className={`group relative flex min-h-8 w-full items-center rounded-lg px-2.5 py-[7px] text-[13px] leading-[18px] outline-none focus-visible:ring-2 focus-visible:ring-brand/45 ${
          active ? "font-semibold text-brand-deep" : "text-nav-ink-soft hover:text-brand-deep"
        }`}
      >
        <HoverWash />
        {active && <ActivePill reduce={reduce} markLeft={-12} tone={tone} />}
        <span className="relative">{item.name}</span>
      </Link>
    );
  }

  return (
    <Tooltip title={item.name} disabled={!collapsed}>
      <Link
        href={item.href!}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.name : undefined}
        className={`${ROW} h-9 text-[13px] ${active ? "font-semibold text-brand-deep" : "text-nav-ink hover:text-brand-deep"}`}
        {...external}
      >
        <HoverWash />
        {active && <ActivePill reduce={reduce} tone={tone} />}
        <Icon
          aria-hidden
          className={`relative h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${active ? t.icon : `text-nav-ink-soft ${t.hover}`}`}
          strokeWidth={active ? 2 : 1.75}
        />
        <RailLabel collapsed={collapsed}>{item.name}</RailLabel>
        {item.badge !== undefined && !collapsed && (
          <span className="relative rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
            {item.badge}
          </span>
        )}
        {item.external && (
          <>
            <ArrowUpRight
              aria-hidden
              className={`relative h-3.5 w-3.5 shrink-0 text-nav-ink-faint transition-[color,translate,opacity] duration-150 group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-brand ${
                collapsed ? "opacity-0" : "opacity-100"
              }`}
              strokeWidth={2}
            />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </>
        )}
      </Link>
    </Tooltip>
  );
}

function NavGroup({
  item,
  collapsed,
  reduce,
  tone,
  open,
  onToggle,
  onOpenFlyout,
}: {
  item: NavEntry;
  collapsed: boolean;
  reduce: boolean;
  tone: NavTone;
  open: boolean;
  onToggle: () => void;
  onOpenFlyout: (item: NavEntry, anchor: HTMLElement) => void;
}) {
  const Icon = item.icon;
  const t = TONE[tone];
  const children = item.children ?? [];
  const hasActiveChild = children.some((c) => c.current);
  const expanded = open && !collapsed;
  // Si el grupo está plegado (o el rail colapsado) el activo lo representa el propio grupo:
  // el indicador nunca desaparece del menú.
  const pillOnParent = hasActiveChild && !expanded;
  const submenuId = `submenu-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <Tooltip title={item.name} disabled={!collapsed}>
        <button
          type="button"
          onClick={(e) => (collapsed ? onOpenFlyout(item, e.currentTarget) : onToggle())}
          aria-expanded={collapsed ? undefined : expanded}
          aria-controls={collapsed ? undefined : submenuId}
          aria-haspopup={collapsed ? "menu" : undefined}
          aria-label={collapsed ? item.name : undefined}
          className={`${ROW} h-9 cursor-pointer text-[13px] ${
            pillOnParent ? "font-semibold text-brand-deep" : hasActiveChild ? "font-medium text-brand-deep" : "text-nav-ink hover:text-brand-deep"
          }`}
        >
          <HoverWash />
          {pillOnParent && <ActivePill reduce={reduce} tone={tone} />}
          <Icon
            aria-hidden
            className={`relative h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
              pillOnParent || hasActiveChild ? t.icon : `text-nav-ink-soft ${t.hover}`
            }`}
            strokeWidth={pillOnParent ? 2 : 1.75}
          />
          <RailLabel collapsed={collapsed}>{item.name}</RailLabel>
          <ChevronDown
            aria-hidden
            className={`relative h-3.5 w-3.5 shrink-0 text-nav-ink-soft transition-[rotate,opacity,color] duration-[260ms] ease-smooth group-hover:text-brand-deep ${
              expanded ? "rotate-180" : ""
            } ${collapsed ? "opacity-0" : "opacity-100"}`}
            strokeWidth={2}
          />
        </button>
      </Tooltip>

      {/* Alto animado sin medir en JS (grid 0fr → 1fr). Cerrado es `inert`: sus enlaces no se
          ven, así que tampoco reciben el tabulador. La guía vertical cae sobre el centro del
          ícono del grupo (x = 34). */}
      <div id={submenuId} className="submenu-collapsible" data-open={expanded ? "true" : "false"} inert={!expanded}>
        <div>
          <ul className="mb-1 ml-[18px] mt-0.5 space-y-0.5 border-l border-nav-line pl-2.5">
            {children.map((child) => (
              <li key={child.name}>
                <NavLink item={child} collapsed={collapsed} reduce={reduce} tone={tone} sub />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Submenú de un grupo con el rail colapsado: flota junto al ícono que lo abrió. */
function NavFlyout({ item, anchor, tone, onClose }: { item: NavEntry; anchor: HTMLElement; tone: NavTone; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top] = useState(() => anchor.getBoundingClientRect().top - 6);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        anchor.focus();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const links = [...(ref.current?.querySelectorAll<HTMLElement>("a") ?? [])];
      if (links.length === 0) return;
      e.preventDefault();
      const i = links.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "ArrowDown" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
      links[next].focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={item.name}
      className="flyout-pop fixed z-[65] w-64 rounded-xl bg-card p-1.5 shadow-nav-flyout"
      // Junto al ícono; en pantallas bajas sube lo justo para no salirse (el % del translate es
      // el alto del propio menú, así que no hay que medirlo).
      style={{ top, left: RAIL_COLLAPSED + 8, translate: `0 min(0px, calc(100dvh - 12px - ${top}px - 100%))` }}
    >
      <p className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[12px] font-semibold text-nav-label">
        <span aria-hidden className={`h-2 w-2 rounded-[3px] ${TONE[tone].dot}`} />
        {item.name}
      </p>
      <ul className="space-y-0.5">
        {(item.children ?? []).map((child) => (
          <li key={child.name} role="none">
            <Link
              role="menuitem"
              href={child.href!}
              onClick={onClose}
              aria-current={child.current ? "page" : undefined}
              className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] leading-[18px] outline-none transition-colors duration-100 focus-visible:bg-nav focus-visible:ring-2 focus-visible:ring-brand/45 ${
                child.current ? "bg-nav font-semibold text-brand-deep" : "text-nav-ink hover:bg-nav"
              }`}
            >
              <child.icon
                aria-hidden
                className={`h-4 w-4 shrink-0 ${child.current ? TONE[tone].icon : "text-nav-ink-soft"}`}
                strokeWidth={child.current ? 2 : 1.75}
              />
              <span className="min-w-0 flex-1">{child.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  );
}

export function MinisitioSidebar({
  sections,
  currentPath,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
  userName,
  userRole,
  onLogout,
}: {
  sections: NavSection[];
  /** Ruta sin el prefijo /minisitio. */
  currentPath: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  userName: string;
  userRole: string;
  onLogout: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const mounted = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  // Grupos abiertos por decisión del condómino; si no ha decidido, abre el que contiene la
  // pantalla actual.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [flyout, setFlyout] = useState<{ item: NavEntry; anchor: HTMLElement; tone: NavTone } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const perfilActivo = currentPath === "/mi-perfil";

  // Bordes con contenido oculto: se difuminan solo cuando de verdad hay algo más allá.
  const measureEdges = () => {
    const el = navRef.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureEdges());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  // La pantalla actual siempre queda a la vista dentro del rail (p. ej. "Números de
  // Emergencia" en una laptop de 768 px de alto).
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !el) return;
    const r = el.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    const delta = r.top < n.top + 8 ? r.top - n.top - 8 : r.bottom > n.bottom - 8 ? r.bottom - n.bottom + 8 : 0;
    if (delta) nav.scrollBy({ top: delta, behavior: reduce ? "auto" : "smooth" });
  }, [currentPath, reduce]);

  // Al navegar se cierra el submenú flotante. Se ajusta durante el render (no en un efecto)
  // para no pintar un cuadro con el menú viejo abierto.
  const [prevPath, setPrevPath] = useState(currentPath);
  if (prevPath !== currentPath) {
    setPrevPath(currentPath);
    setFlyout(null);
  }

  useEffect(() => {
    if (mobileOpen) closeRef.current?.focus({ preventScroll: true });
  }, [mobileOpen]);

  const brandHeight = collapsed ? BRAND_HEIGHT.collapsed : BRAND_HEIGHT.expanded;

  return (
    <LayoutGroup id="minisitio-rail">
    <aside
      aria-label="Menú del portal"
      style={{ width: collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED }}
      className={`group/rail fixed inset-y-0 left-0 z-50 flex flex-col bg-nav shadow-nav-rail transition-[width,translate,box-shadow] duration-[260ms] ease-smooth lg:translate-x-0 ${
        mobileOpen ? "translate-x-0 shadow-nav-flyout" : "-translate-x-full"
      }`}
    >
      {/* Marca. El lockup horizontal (1077×290) no cabe en 68 px: colapsado se cruza con el
          sello cuadrado. Cada logo se queda en su sitio y solo cambia su opacidad. */}
      <div
        className="relative shrink-0 overflow-hidden border-b border-nav-line-soft transition-[height] duration-[260ms] ease-smooth"
        style={{ height: brandHeight }}
      >
        <Link
          href={msPath("/")}
          aria-label="Val'Quirico, ir a Bienvenida"
          className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/45"
        >
          <span
            className={`absolute top-3 flex flex-col items-center gap-2 transition-opacity ${
              collapsed ? "pointer-events-none opacity-0 duration-100" : "opacity-100 delay-75 duration-200"
            }`}
            style={{ left: 0, width: RAIL_EXPANDED }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/valquirico-logo.png" alt="" width={163} height={44} className="h-11 w-auto" draggable={false} />
            <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full bg-brand-mint px-2.5 text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-brand-deep">
              Minisitio condóminos
            </span>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mono.png"
            alt=""
            width={36}
            height={37}
            draggable={false}
            className={`absolute h-[37px] w-9 transition-opacity ${
              collapsed ? "opacity-100 delay-100 duration-200" : "pointer-events-none opacity-0 duration-100"
            }`}
            style={{ left: 16, top: 13 }}
          />
        </Link>
        <button
          ref={closeRef}
          type="button"
          onClick={onCloseMobile}
          aria-label="Cerrar menú"
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-nav-ink-soft outline-none transition-colors duration-150 hover:bg-white/60 hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45 active:scale-95 lg:hidden"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      {/* Pestaña para colapsar: asoma del borde del rail al pasar el cursor (siempre visible en
          pantallas táctiles), centrada sobre la línea de la marca. */}
      <Tooltip
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="absolute -right-3 z-10 hidden transition-[top] duration-[260ms] ease-smooth lg:block"
        style={{ top: brandHeight - 12 }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-expanded={!collapsed}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-nav-ink-soft opacity-0 shadow-[0_1px_3px_rgb(61_60_34/0.16),0_0_0_1px_rgb(61_60_34/0.1)] outline-none transition-[opacity,color,scale] duration-200 ease-smooth hover:scale-110 hover:text-brand-deep focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand/45 active:scale-95 group-hover/rail:opacity-100 pointer-coarse:opacity-100"
        >
          <ChevronLeft
            aria-hidden
            className={`h-3.5 w-3.5 transition-[rotate] duration-[260ms] ease-smooth ${collapsed ? "rotate-180" : ""}`}
            strokeWidth={2.25}
          />
        </button>
      </Tooltip>

      <nav
        ref={navRef}
        aria-label="Secciones del portal"
        onScroll={measureEdges}
        data-fade-top={edges.top || undefined}
        data-fade-bottom={edges.bottom || undefined}
        className="rail-scroll scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-3"
      >
          <div className="shrink-0 space-y-2">
            {sections.map((section) => (
              <section
                key={section.title}
                aria-label={section.title}
                className="rounded-xl bg-nav-well p-1 shadow-nav-well"
              >
                <div className="submenu-collapsible" data-open={collapsed ? "false" : "true"} aria-hidden={collapsed || undefined}>
                  <div>
                    <h2 className="flex items-center gap-2 whitespace-nowrap px-[9px] pb-1 pt-1.5 text-[12px] font-semibold leading-4 text-nav-label">
                      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[3px] ${TONE[section.tone].dot}`} />
                      {section.title}
                    </h2>
                  </div>
                </div>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      {item.children?.length ? (
                        <NavGroup
                          item={item}
                          collapsed={collapsed}
                          reduce={reduce}
                          tone={section.tone}
                          open={openGroups[item.name] ?? item.children.some((c) => c.current)}
                          onToggle={() =>
                            setOpenGroups((prev) => ({
                              ...prev,
                              [item.name]: !(prev[item.name] ?? item.children!.some((c) => c.current)),
                            }))
                          }
                          onOpenFlyout={(it, anchor) =>
                            setFlyout((prev) => (prev?.item.name === it.name ? null : { item: it, anchor, tone: section.tone }))
                          }
                        />
                      ) : (
                        <NavLink item={item} collapsed={collapsed} reduce={reduce} tone={section.tone} />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* El pueblo, al final del menú: si sobra alto se asienta sobre la cuenta (mt-auto) y si
              no, queda después del último módulo; nunca le quita espacio a las opciones. Se pliega
              con el rail. Al pasar el cursor, la bandera ondea y la campana se mece. */}
          <div
            aria-hidden
            className={`vq-scene -mx-3 -mb-3 mt-auto shrink-0 overflow-hidden transition-[height,opacity,padding] duration-[260ms] ease-smooth ${
              collapsed ? "h-0 pt-0 opacity-0" : "h-[112px] pt-3 opacity-100"
            }`}
          >
            <ValquiricoVista bandera="hover" className="block h-[100px] w-[268px] max-w-none" />
          </div>
      </nav>

      {/* Cuenta: avatar con iniciales, Mi Perfil y Cerrar Sesión con la misma geometría que el
          menú (el avatar comparte el centro x = 34 con los íconos). */}
      <div className="shrink-0 border-t border-nav-line-soft px-3 pb-3 pt-2">
        <div className="flex h-12 items-center gap-2.5 px-1.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold tracking-[0.02em] text-brand-mint shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]"
          >
            {initials(userName)}
          </span>
          <span
            className={`min-w-0 flex-1 transition-opacity ${collapsed ? "opacity-0 duration-100" : "opacity-100 delay-75 duration-200"}`}
          >
            <span className="block truncate text-[13px] font-semibold leading-[18px] text-brand-deep">{userName}</span>
            <span className="block truncate text-[12px] leading-4 text-nav-ink-soft">{userRole}</span>
          </span>
        </div>

        <ul className="space-y-0.5 px-1">
          <li>
            <Tooltip title="Mi Perfil" disabled={!collapsed}>
              <Link
                href={msPath("/mi-perfil")}
                aria-current={perfilActivo ? "page" : undefined}
                aria-label={collapsed ? "Mi Perfil" : undefined}
                className={`${ROW} h-9 text-[13px] ${perfilActivo ? "font-semibold text-brand-deep" : "text-nav-ink hover:text-brand-deep"}`}
              >
                <HoverWash />
                {perfilActivo && <ActivePill reduce={reduce} />}
                <Settings
                  aria-hidden
                  className={`relative h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                    perfilActivo ? "text-brand-accent" : "text-nav-ink-soft group-hover:text-brand"
                  }`}
                  strokeWidth={perfilActivo ? 2 : 1.75}
                />
                <RailLabel collapsed={collapsed}>Mi Perfil</RailLabel>
              </Link>
            </Tooltip>
          </li>
          <li>
            <Tooltip title="Cerrar Sesión" disabled={!collapsed}>
              <button
                type="button"
                onClick={onLogout}
                aria-label={collapsed ? "Cerrar Sesión" : undefined}
                className={`${ROW} h-9 text-[13px] text-nav-ink hover:text-danger focus-visible:ring-danger/40`}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-lg transition-colors duration-200 group-hover:bg-danger/[0.07] group-hover:duration-75"
                />
                <LogOut
                  aria-hidden
                  className="relative h-[18px] w-[18px] shrink-0 text-nav-ink-soft transition-colors duration-150 group-hover:text-danger"
                  strokeWidth={1.75}
                />
                <RailLabel collapsed={collapsed}>Cerrar Sesión</RailLabel>
              </button>
            </Tooltip>
          </li>
        </ul>
      </div>

      {mounted && flyout && collapsed && (
        <NavFlyout item={flyout.item} anchor={flyout.anchor} tone={flyout.tone} onClose={() => setFlyout(null)} />
      )}
    </aside>
    </LayoutGroup>
  );
}
