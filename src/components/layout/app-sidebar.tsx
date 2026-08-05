"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import {
  BookUser,
  Building2,
  ChartColumn,
  ChartPie,
  ChevronDown,
  Coins,
  HandCoins,
  Headset,
  House,
  KeyRound,
  LandPlot,
  Landmark,
  LogOut,
  MapPinHouse,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trees,
  UsersRound,
  Vote,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { usePermissions } from "@/components/providers/permissions-provider";

// ─────────────────────────────────────────────────────────────────────────────
// Modelo de navegación
// ─────────────────────────────────────────────────────────────────────────────

type NavSubItem = { label: string; href: string; requiredModule?: string };

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon | ElementType;
  requiredModule?: string;
  items?: NavSubItem[];
};

type NavSection = {
  title: string;
  /** Glifo de dominio que se marca al agua en la esquina del módulo. */
  glyph: LucideIcon;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Gestión",
    glyph: Trees,
    items: [
      { label: "Inicio", href: "/", icon: House },
      { label: "Estadísticas", href: "/estadisticas", icon: ChartColumn, requiredModule: "Reporte condominio" },
      {
        label: "Condominio",
        icon: Building2,
        items: [
          { label: "Reporte Territorial", href: "/reporte-condominio", requiredModule: "Reporte condominio" },
          { label: "Configuración", href: "/condominio", requiredModule: "Condominio" },
          { label: "Estructura Condominal", href: "/estructura-condominal", requiredModule: "Estructura condominal" },
        ],
      },
      { label: "Directorio de Personas", href: "/directorio", icon: BookUser, requiredModule: "Directorio" },
      { label: "Directorio de sitios", href: "/contactos", icon: MapPinHouse, requiredModule: "Contactos" },
      { label: "Reglamentos y Documentos", href: "/reglamentos", icon: ScrollText, requiredModule: "Reglamentos" },
    ],
  },
  {
    title: "Administración",
    glyph: House,
    items: [
      {
        label: "Áreas Privativas",
        icon: LandPlot,
        items: [
          { label: "Listado", href: "/areas-privativas", requiredModule: "Areas privativas" },
          { label: "Seguridad", href: "/listado-seguridad" },
          { label: "Barrios", href: "/listado-zonas", requiredModule: "Barrios" },
          { label: "Usos de Suelo", href: "/listado-usos-suelo", requiredModule: "Usos de suelo" },
        ],
      },
      {
        label: "Atención",
        icon: Headset,
        items: [
          { label: "Tickets", href: "/tickets", requiredModule: "Tickets" },
          { label: "Departamentos", href: "/departamentos-tickets", requiredModule: "Departamentos tickets" },
          { label: "Notificaciones", href: "/notificaciones", requiredModule: "Notificaciones" },
          { label: "Categorías", href: "/categorias-notificacion", requiredModule: "Categorías notificaciones" },
        ],
      },
    ],
  },
  {
    title: "Financiero",
    glyph: Coins,
    items: [
      { label: "Resumen", href: "/resumen-financiero", icon: ChartPie, requiredModule: "Resumen financiero" },
      {
        label: "Ingresos",
        icon: TrendingUp,
        items: [
          { label: "Listado", href: "/listado-ingresos", requiredModule: "Cobros" },
          { label: "Estructura", href: "/listado-estructura-otros-ingresos", requiredModule: "Otros ingresos" },
          { label: "Cobros Masivos", href: "/cobros-masivos", requiredModule: "Cobros masivos" },
        ],
      },
      {
        label: "Egresos",
        icon: TrendingDown,
        items: [
          { label: "Gastos", href: "/listado-gastos", requiredModule: "Gastos" },
          { label: "Presupuestos", href: "/presupuestos", requiredModule: "Presupuesto" },
          { label: "Estructura Presupuestal", href: "/listado-estructura-presupuesto", requiredModule: "Estructura Presupuesto" },
        ],
      },
      { label: "Sincronización Luca", href: "/sincronizacion-luca", icon: RefreshCw },
      { label: "Cuotas Ordinarias", href: "/reporte-cuotas", icon: ReceiptText },
      { label: "Cuotas Extraordinarias", href: "/reporte-cuotas-extraordinarias", icon: HandCoins },
      { label: "Sanciones", href: "/sanciones", icon: TriangleAlert, requiredModule: "Catálogo de sanciones" },
    ],
  },
  {
    title: "Gobernanza",
    glyph: Landmark,
    items: [
      { label: "Convocatorias", href: "/gobernanza/convocatorias", icon: Megaphone, requiredModule: "Convocatorias" },
    ],
  },
  {
    title: "Condómino",
    glyph: KeyRound,
    items: [
      { label: "Mis convocatorias", href: "/condomino/mis-convocatorias", icon: Vote, requiredModule: "Convocatorias condómino" },
    ],
  },
  {
    title: "Seguridad",
    glyph: ShieldCheck,
    items: [
      { label: "Cambiar contraseña", href: "/cambio-contrasena", icon: KeyRound },
      { label: "Roles", href: "/listado-roles", icon: UsersRound, requiredModule: "Roles" },
      { label: "Cerrar sesión", href: "/logout", icon: LogOut },
    ],
  },
];

export const SIDEBAR_WIDTH_EXPANDED = 268;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

/** Altura del bloque de marca. Colapsado usa monograma, que necesita mucho
 *  menos aire que el lockup horizontal. */
const BRAND_HEIGHT = { expanded: 100, collapsed: 64 } as const;

export function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion
// ─────────────────────────────────────────────────────────────────────────────

const EASE_SMOOTH = [0.32, 0.72, 0, 1] as const;

/** Muelle del indicador activo: rápido, con un asentamiento casi crítico. */
const INDICATOR_SPRING: Transition = { type: "spring", stiffness: 480, damping: 38, mass: 0.7 };

/**
 * Desplazamiento horizontal del indicador respecto a su fila. Derivado de los
 * paddings reales, no a ojo: `item` lo deja a ras de la pared interna del
 * módulo (p-1.5 = 6px); `sub` lo deja justo sobre la guía vertical del submenú
 * (ml-18 + border-1 + pl-10 = 29 desde el módulo, guía en 18 → -11).
 */
const INDICATOR_INSET = { item: -6, itemCollapsed: -4, sub: -11 } as const;

/** Proporción del ancho del rail que ocupan los módulos, por estado.
 *  La canaleta se reparte a partes iguales a los dos lados. */
const WELL_RATIO = { expanded: 0.9, collapsed: 0.85 } as const;

const gutterFor = (collapsed: boolean) =>
  collapsed
    ? (SIDEBAR_WIDTH_COLLAPSED * (1 - WELL_RATIO.collapsed)) / 2
    : (SIDEBAR_WIDTH_EXPANDED * (1 - WELL_RATIO.expanded)) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// Contexto interno (evita perforar props por 4 niveles)
// ─────────────────────────────────────────────────────────────────────────────

type SidebarCtxValue = {
  /** Ancho visual efectivo: colapsado y SIN peek de hover. */
  collapsed: boolean;
  currentPath: string;
  indicatorId: string;
  openMenus: string[];
  toggleMenu: (label: string) => void;
  reduce: boolean;
  onNavigate: () => void;
};

const SidebarCtx = createContext<SidebarCtxValue | null>(null);

function useSidebarCtx() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("Sidebar subcomponents must render inside <SidebarBody>");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Piezas atómicas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indicador dorado del ítem activo. Un único elemento compartido vía `layoutId`:
 * al navegar se DESLIZA de un ítem a otro en lugar de aparecer/desaparecer.
 * Vive en `left-[-10px]`, que con el `px-2.5` del <nav> lo deja a ras del borde
 * del rail — así el recorrido es puramente vertical.
 */
function ActiveIndicator({ variant = "item" }: { variant?: "item" | "sub" }) {
  const { indicatorId, reduce, collapsed } = useSidebarCtx();
  // Colapsado el módulo aprieta su padding de 6 a 4px; el marcador lo sigue
  // para no despegarse de la pared interna.
  const inset =
    variant === "sub"
      ? INDICATOR_INSET.sub
      : collapsed
        ? INDICATOR_INSET.itemCollapsed
        : INDICATOR_INSET.item;
  return (
    <motion.span
      layoutId={indicatorId}
      style={{ left: inset }}
      className="absolute top-1/2 -mt-2 h-4 w-[3px] rounded-r-full bg-brand-accent"
      transition={reduce ? { duration: 0 } : INDICATOR_SPRING}
    />
  );
}

/** Etiqueta que se desvanece al colapsar y entra con un leve retardo al expandir. */
function ItemLabel({ children, className }: { children: ReactNode; className?: string }) {
  const { reduce } = useSidebarCtx();
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -6 }}
      transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE_SMOOTH, delay: 0.06 }}
      className={cn("min-w-0 flex-1 truncate text-left", className)}
    >
      {children}
    </motion.span>
  );
}

const ICON_SIZE = 17;
const ICON_SIZE_COLLAPSED = 19;

function NavIcon({
  icon: Icon,
  emphasis,
}: {
  icon: LucideIcon | ElementType;
  emphasis: "idle" | "active" | "branch";
}) {
  // Colapsado el icono carga con todo el significado de la fila: merece peso.
  const { collapsed } = useSidebarCtx();
  const size = collapsed ? ICON_SIZE_COLLAPSED : ICON_SIZE;
  return (
    <Icon
      className={cn(
        "shrink-0 transition-colors duration-150",
        emphasis === "active" && "text-brand-accent",
        emphasis === "branch" && "text-brand",
        emphasis === "idle" && "text-nav-ink-soft group-hover:text-brand"
      )}
      style={{ width: size, height: size }}
      strokeWidth={emphasis === "active" ? 2 : 1.75}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filas de navegación
// ─────────────────────────────────────────────────────────────────────────────

function SubItemRow({ sub }: { sub: NavSubItem }) {
  const { currentPath, onNavigate } = useSidebarCtx();
  const isActive = currentPath === normalizePath(sub.href);

  return (
    <Link
      href={sub.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2 rounded-md pl-2 pr-2.5",
        "text-[12.5px] transition-colors duration-150",
        isActive
          ? "bg-card font-semibold text-brand-deep shadow-nav-item"
          : "text-nav-ink-soft hover:bg-nav-hover hover:text-brand-deep"
      )}
    >
      {isActive && <ActiveIndicator variant="sub" />}
      <span
        className={cn(
          "h-1 w-1 shrink-0 rounded-full transition-colors duration-150",
          isActive ? "bg-brand-accent" : "bg-nav-ink-faint group-hover:bg-brand"
        )}
      />
      <span className="truncate">{sub.label}</span>
    </Link>
  );
}

function BranchRow({ item, visibleSubs }: { item: NavItem; visibleSubs: NavSubItem[] }) {
  const { collapsed, currentPath, openMenus, toggleMenu, reduce } = useSidebarCtx();

  const isOpen = openMenus.includes(item.label);
  const hasActiveChild = visibleSubs.some((s) => normalizePath(s.href) === currentPath);

  // Colapsado sin peek solo se ve el ícono; el clic sigue alternando el submenú
  // para que ya esté abierto en cuanto el rail se despliega por hover.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => toggleMenu(item.label)}
        aria-label={item.label}
        aria-expanded={isOpen}
        className={cn(
          "group relative flex h-9 w-full items-center justify-center rounded-lg",
          "transition-colors duration-150",
          hasActiveChild ? "bg-card shadow-nav-item" : "hover:bg-nav-hover"
        )}
      >
        {hasActiveChild && <ActiveIndicator />}
        <NavIcon icon={item.icon} emphasis={hasActiveChild ? "active" : "idle"} />
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleMenu(item.label)}
        aria-expanded={isOpen}
        className={cn(
          "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5",
          "text-[13px] font-medium transition-colors duration-150",
          "hover:bg-nav-hover hover:text-brand-deep",
          hasActiveChild || isOpen ? "text-brand-deep" : "text-nav-ink"
        )}
      >
        <NavIcon icon={item.icon} emphasis={hasActiveChild ? "branch" : "idle"} />
        <ItemLabel>{item.label}</ItemLabel>
        <motion.span
          className="shrink-0 text-nav-ink-soft transition-colors duration-150 group-hover:text-brand-deep"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_SMOOTH }}
        >
          <ChevronDown style={{ width: 13, height: 13 }} strokeWidth={2} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="submenu"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { height: { duration: 0.26, ease: EASE_SMOOTH }, opacity: { duration: 0.16 } }
            }
            className="overflow-hidden"
          >
            {/* La guía vertical ancla visualmente los hijos al padre */}
            <div className="ml-[18px] mt-0.5 mb-1 space-y-0.5 border-l border-nav-line pl-2.5">
              {visibleSubs.map((sub, i) => (
                <motion.div
                  key={sub.href}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_SMOOTH, delay: 0.03 + i * 0.025 }
                  }
                >
                  <SubItemRow sub={sub} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeafRow({ item }: { item: NavItem }) {
  const { collapsed, currentPath, onNavigate } = useSidebarCtx();

  const isActive = item.href ? currentPath === normalizePath(item.href) : false;
  const isLogout = item.href === "/logout";

  const rowClass = cn(
    "group relative flex h-9 items-center rounded-lg transition-colors duration-150",
    collapsed ? "w-full justify-center" : "gap-2.5 px-2.5",
    isActive
      ? "bg-card text-brand-deep font-semibold shadow-nav-item"
      : isLogout
        ? "text-nav-ink hover:bg-danger/6 hover:text-danger"
        : "text-nav-ink hover:bg-nav-hover hover:text-brand-deep"
  );

  const inner = (
    <>
      {isActive && <ActiveIndicator />}
      <Icon item={item} isActive={isActive} isLogout={isLogout} />
      <AnimatePresence initial={false}>
        {!collapsed && <ItemLabel className="text-[13px]">{item.label}</ItemLabel>}
      </AnimatePresence>
    </>
  );

  return (
    <div className="relative">
      {isLogout ? (
        <button
          type="button"
          onClick={() => {
            window.location.href = "/logout";
          }}
          aria-label={collapsed ? item.label : undefined}
          className={rowClass}
        >
          {inner}
        </button>
      ) : (
        <Link
          href={item.href || "#"}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={rowClass}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}

function Icon({ item, isActive, isLogout }: { item: NavItem; isActive: boolean; isLogout: boolean }) {
  if (isLogout) {
    const Cmp = item.icon;
    return (
      <Cmp
        className="shrink-0 text-nav-ink-soft transition-colors duration-150 group-hover:text-danger"
        style={{ width: ICON_SIZE, height: ICON_SIZE }}
        strokeWidth={1.75}
      />
    );
  }
  return <NavIcon icon={item.icon} emphasis={isActive ? "active" : "idle"} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuerpo del sidebar
// ─────────────────────────────────────────────────────────────────────────────

function SidebarSections({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { collapsed } = useSidebarCtx();
  const permissions = usePermissions();

  const sections = useMemo(() => {
    return NAV_SECTIONS.map((section) => {
      const items = section.items.flatMap<{ item: NavItem; subs: NavSubItem[] }>((item) => {
        if (item.requiredModule && !permissions[item.requiredModule]?.canRead) return [];
        const subs = (item.items ?? []).filter(
          (sub) => !sub.requiredModule || permissions[sub.requiredModule]?.canRead
        );
        if (item.items?.length && subs.length === 0) return [];
        return [{ item, subs }];
      });
      return { title: section.title, glyph: section.glyph, items };
    }).filter((s) => s.items.length > 0);
  }, [permissions]);

  // Se calcula en px desde la constante de ancho, no con porcentajes CSS: un
  // `margin` en porcentaje dentro del bloque pegajoso resolvería contra la caja
  // de contenido del nav (ya descontada la canaleta) y no contra el rail, y el
  // buscador quedaría desalineado de los módulos justo en el estado más
  // estrecho, que es donde más se nota.
  const gutter = gutterFor(collapsed);

  return (
    // El buscador vive DENTRO del scroll a propósito. Fuera de él conservaba
    // los 268px del rail mientras los módulos perdían el ancho del scrollbar,
    // y quedaban desalineados. Compensar con padding no sirve: en macOS con
    // barras superpuestas el scrollbar mide 0 y el desfase se invertiría.
    // Compartiendo caja de contenido, coinciden en cualquier sistema.
    <nav
      className={cn(
        "scrollbar-hidden flex-1 overflow-y-auto overflow-x-hidden pb-3",
        "transition-[padding] duration-[260ms] ease-smooth"
      )}
      style={{ paddingLeft: gutter, paddingRight: gutter }}
    >
      <div
        className="sticky top-0 z-10 bg-nav pb-2 pt-3"
        style={{ marginLeft: -gutter, marginRight: -gutter, paddingLeft: gutter, paddingRight: gutter }}
      >
        <SidebarSearch onOpenSearch={onOpenSearch} />
      </div>

      <div className={collapsed ? "space-y-1.5" : "space-y-2"}>
      {sections.map((section) => {
        const Glyph = section.glyph;
        return (
          // Módulo incrustado. El fondo hundido tiene un efecto colateral a
          // favor: el ítem activo (blanco + sombra) contrasta MÁS aquí que
          // sobre el pergamino plano — la señal principal del rail se refuerza.
          <section
            key={section.title}
            className={cn(
              "relative bg-nav-sunken shadow-nav-well",
              collapsed ? "rounded-lg p-1" : "rounded-xl p-1.5"
            )}
          >
            {/* Marca de agua de dominio. Capa propia con overflow para que el
                glifo se recorte contra la esquina redondeada del módulo sin
                clipear el indicador dorado, que vive fuera de esta capa. */}
            {!collapsed && (
            <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
              <Glyph
                className="watermark-glyph absolute top-1/2 text-brand-deep/[0.06]"
                style={{
                  // Proporcional al módulo, no un tamaño fijo: un glifo de 76px
                  // se perdía en "Gestión" (6 ítems) y desbordaba "Gobernanza"
                  // (1 ítem). El tope evita que domine los módulos altos.
                  height: "min(118%, 132px)",
                  width: "auto",
                  right: -10,
                  transform: "translateY(-50%)",
                }}
                strokeWidth={1.5}
              />
            </span>
            )}

            {!collapsed && (
              <p className="relative mb-1 px-2 pt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-nav-label">
                {section.title}
              </p>
            )}
            <div className="relative space-y-px">
              {section.items.map(({ item, subs }) =>
                subs.length > 0 ? (
                  <BranchRow key={item.label} item={item} visibleSubs={subs} />
                ) : (
                  <LeafRow key={item.label} item={item} />
                )
              )}
            </div>
          </section>
        );
      })}
      </div>
    </nav>
  );
}

function SidebarSearch({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { collapsed } = useSidebarCtx();

  return (
    <button
      type="button"
      onClick={onOpenSearch}
      aria-label="Buscar"
      className={cn(
        // Superficie hundida: el inset shadow la mete "dentro" del rail,
        // en oposición al ítem activo que sube a blanco.
        "flex w-full items-center rounded-lg bg-nav-sunken text-nav-ink-soft",
        "shadow-nav-well",
        "transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep",
        "active:scale-[0.99] motion-reduce:active:scale-100",
        collapsed ? "h-9 justify-center" : "h-9 gap-2.5 px-2.5"
      )}
    >
      <Search style={{ width: 15, height: 15 }} strokeWidth={2} className="shrink-0" />
      <AnimatePresence initial={false}>
        {!collapsed && <ItemLabel className="text-[13px] font-normal">Buscar…</ItemLabel>}
      </AnimatePresence>
      {!collapsed && (
        <kbd className="shrink-0 rounded border border-nav-line bg-card px-1.5 py-px font-sans text-[10px] font-semibold text-nav-ink-faint">
          ⌘K
        </kbd>
      )}
    </button>
  );
}

function SidebarBrand({
  navbarLogoUrl,
  navbarLogoAlt,
}: {
  navbarLogoUrl: string | null;
  navbarLogoAlt: string;
}) {
  const { collapsed, onNavigate, reduce } = useSidebarCtx();
  const monogram = (navbarLogoAlt.trim()[0] || "V").toUpperCase();

  return (
    // Expandido: el lockup horizontal completo (el logo YA dice "Val'Quirico",
    // por eso no hay wordmark repitiéndolo).
    // Colapsado: monograma. El logo real es 1077×290 — a cualquier altura
    // legible desborda un rail de 68px y se recorta. Un monograma cuadrado es
    // la única marca que funciona sin depender del aspect ratio del archivo,
    // que además aquí viene de BD y puede cambiar.
    <motion.div
      className="flex shrink-0 items-center justify-center overflow-hidden border-b border-nav-line-soft px-3"
      animate={{ height: collapsed ? BRAND_HEIGHT.collapsed : BRAND_HEIGHT.expanded }}
      transition={reduce ? { duration: 0 } : { duration: 0.26, ease: EASE_SMOOTH }}
    >
      <Link
        href="/"
        onClick={onNavigate}
        aria-label={navbarLogoAlt}
        className="flex min-w-0 flex-col items-center gap-2 rounded-lg transition-opacity duration-150 hover:opacity-80"
      >
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.span
              key="monogram"
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
              transition={reduce ? { duration: 0 } : { duration: 0.16, ease: EASE_SMOOTH }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-[15px] font-bold text-white shadow-nav-item"
            >
              {monogram}
            </motion.span>
          ) : (
            <motion.span
              key="lockup"
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_SMOOTH }}
              className="flex flex-col items-center gap-2"
            >
              {navbarLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={navbarLogoUrl}
                  alt={navbarLogoAlt}
                  className="h-[52px] w-auto max-w-[188px] shrink-0 object-contain"
                />
              ) : (
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-brand text-[21px] font-bold text-white">
                  {monogram}
                </span>
              )}
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-card px-2 py-[3px] text-[9px] font-bold uppercase leading-none tracking-[0.12em] text-brand ring-1 ring-nav-line">
                Insulae 2.0
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
}

function SidebarUser({
  userName,
  initials,
  isPinnedCollapsed,
  onToggleCollapsed,
}: {
  userName: string;
  initials: string;
  /** Preferencia FIJADA, no el estado visual: el icono no debe cambiar durante el peek. */
  isPinnedCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { collapsed, reduce } = useSidebarCtx();

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border-t border-nav-line-soft bg-nav-sunken/60",
        collapsed
          ? "flex flex-col items-center gap-1.5 px-2 py-2.5"
          : "flex items-center gap-2.5 px-3 py-3"
      )}
    >
      <span
        title={collapsed ? userName : undefined}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold tracking-wide text-white shadow-nav-item"
      >
        {initials}
      </span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18, ease: EASE_SMOOTH, delay: 0.06 }}
            className="min-w-0 flex-1"
          >
            <p className="truncate text-[12.5px] font-semibold leading-tight text-brand-deep">{userName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium leading-tight text-nav-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sesión activa
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={isPinnedCollapsed ? "Fijar menú abierto" : "Colapsar menú"}
          aria-expanded={!isPinnedCollapsed}
          title={isPinnedCollapsed ? "Fijar menú abierto" : "Colapsar menú"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            "text-nav-ink-soft transition-colors duration-150",
            "hover:bg-nav-hover hover:text-brand-deep",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
            "active:scale-90 motion-reduce:active:scale-100"
          )}
        >
          {/* Iconos de panel en vez de un chevron suelto: fuera del borde del
              rail, un chevron ya no tiene contra qué apuntar. Estos dibujan
              literalmente el estado destino. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isPinnedCollapsed ? "open" : "close"}
              initial={reduce ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.7 }}
              transition={reduce ? { duration: 0 } : { duration: 0.14, ease: EASE_SMOOTH }}
              className="flex"
            >
              {isPinnedCollapsed ? (
                <PanelLeftOpen style={{ width: 16, height: 16 }} strokeWidth={1.75} />
              ) : (
                <PanelLeftClose style={{ width: 16, height: 16 }} strokeWidth={1.75} />
              )}
            </motion.span>
          </AnimatePresence>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider + composición
// ─────────────────────────────────────────────────────────────────────────────

function useOpenMenus(currentPath: string) {
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = useCallback((label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }, []);

  const activeParents = useMemo(() => {
    const parents: string[] = [];
    for (const section of NAV_SECTIONS)
      for (const item of section.items)
        if (item.items?.some((sub) => normalizePath(sub.href) === currentPath)) parents.push(item.label);
    return parents;
  }, [currentPath]);

  useEffect(() => {
    setOpenMenus((prev) => {
      const merged = Array.from(new Set([...prev, ...activeParents]));
      return merged.length === prev.length ? prev : merged;
    });
  }, [activeParents]);

  return { openMenus, toggleMenu };
}

function SidebarProvider({
  collapsed,
  indicatorId,
  onNavigate,
  children,
}: {
  collapsed: boolean;
  indicatorId: string;
  onNavigate: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || "/");
  const reduce = useReducedMotion() ?? false;
  const { openMenus, toggleMenu } = useOpenMenus(currentPath);

  const value = useMemo<SidebarCtxValue>(
    () => ({ collapsed, currentPath, indicatorId, openMenus, toggleMenu, reduce, onNavigate }),
    [collapsed, currentPath, indicatorId, openMenus, toggleMenu, reduce, onNavigate]
  );

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

/**
 * Hover-to-peek: con el rail fijado en colapsado, pasar el cursor lo despliega
 * temporalmente SOBRE el contenido (nunca empujándolo — reflowear la página
 * entera en cada roce accidental del cursor es inaceptable).
 *
 * Los retardos son asimétricos a propósito: entrar cuesta 110ms para no
 * dispararse al cruzar la pantalla de lado a lado; salir cuesta 220ms para
 * perdonar el temblor al bajar por la lista.
 */
function usePeek(isCollapsed: boolean) {
  const [isPeeked, setPeeked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHover = useRef(true);

  useEffect(() => {
    canHover.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const open = useCallback(() => {
    if (!isCollapsed || !canHover.current) return;
    clear();
    timer.current = setTimeout(() => setPeeked(true), 110);
  }, [isCollapsed, clear]);

  const close = useCallback(() => {
    clear();
    timer.current = setTimeout(() => setPeeked(false), 220);
  }, [clear]);

  const closeNow = useCallback(() => {
    clear();
    setPeeked(false);
  }, [clear]);

  // Enfocar con teclado también despliega: en un rail colapsado, tabular a
  // ciegas entre iconos sin etiqueta no es navegable.
  const openNow = useCallback(() => {
    if (!isCollapsed) return;
    clear();
    setPeeked(true);
  }, [isCollapsed, clear]);

  useEffect(() => {
    if (!isCollapsed) setPeeked(false);
  }, [isCollapsed]);

  useEffect(() => clear, [clear]);

  return { isPeeked, open, close, closeNow, openNow };
}

type SidebarChromeProps = {
  navbarLogoUrl: string | null;
  navbarLogoAlt: string;
  userName: string;
  userInitials: string;
  onOpenSearch: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Rail de escritorio
// ─────────────────────────────────────────────────────────────────────────────

export function DesktopSidebar({
  isCollapsed,
  onToggleCollapsed,
  ...chrome
}: SidebarChromeProps & { isCollapsed: boolean; onToggleCollapsed: () => void }) {
  const { isPeeked, open, close, closeNow, openNow } = usePeek(isCollapsed);

  // Ancho visual del rail. Ojo: NO es `--sidebar-w` (que gobierna el padding del
  // contenido y se queda en 68px durante el peek, para que la página no se mueva).
  const expanded = !isCollapsed || isPeeked;
  const railWidth = expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <SidebarProvider
      collapsed={!expanded}
      indicatorId="nav-indicator-desktop"
      onNavigate={closeNow}
    >
      <aside
        style={{ width: railWidth }}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocusCapture={openNow}
        onBlurCapture={close}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-nav lg:flex",
          "transition-[width,box-shadow] duration-[260ms] ease-smooth",
          // Durante el peek el rail flota por encima del contenido: la sombra
          // profunda es lo que comunica que está encima y no empujando.
          isPeeked ? "shadow-nav-flyout" : "shadow-nav-rail"
        )}
      >
        <SidebarBrand navbarLogoUrl={chrome.navbarLogoUrl} navbarLogoAlt={chrome.navbarLogoAlt} />
        <SidebarSections onOpenSearch={chrome.onOpenSearch} />
        <SidebarUser
          userName={chrome.userName}
          initials={chrome.userInitials}
          isPinnedCollapsed={isCollapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      </aside>
    </SidebarProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer móvil
// ─────────────────────────────────────────────────────────────────────────────

export function MobileSidebar({
  isOpen,
  onClose,
  ...chrome
}: SidebarChromeProps & { isOpen: boolean; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-deep/35 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={reduce ? { opacity: 0 } : { x: "-100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "-100%" }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42, mass: 0.9 }
            }
            className="absolute inset-y-0 left-0 flex w-[276px] flex-col bg-nav shadow-nav-flyout"
          >
            <SidebarProvider collapsed={false} indicatorId="nav-indicator-mobile" onNavigate={onClose}>
              <div className="relative">
                <SidebarBrand
                  navbarLogoUrl={chrome.navbarLogoUrl}
                  navbarLogoAlt={chrome.navbarLogoAlt}
                />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar menú"
                  className="absolute right-2.5 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-nav-ink-soft transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep active:scale-90"
                >
                  <X style={{ width: 17, height: 17 }} strokeWidth={2} />
                </button>
              </div>
              <SidebarSections onOpenSearch={chrome.onOpenSearch} />
              <SidebarUser userName={chrome.userName} initials={chrome.userInitials} />
            </SidebarProvider>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
