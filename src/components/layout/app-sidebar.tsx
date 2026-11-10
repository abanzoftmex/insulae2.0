"use client";

import Image from "next/image";
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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookUser,
  Building2,
  ChartColumn,
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
          { label: "Reporte de uso de suelo", href: "/reporte-condominio", requiredModule: "Reporte condominio" },
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
          { label: "Seguridad", href: "/listado-seguridad", requiredModule: "Áreas Privativas para caseta de seguridad" },
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
      { label: "Sincronización Luca", href: "/sincronizacion-luca", icon: RefreshCw, requiredModule: "Sincronización Luca" },
      { label: "Cuotas Ordinarias", href: "/reporte-cuotas", icon: ReceiptText, requiredModule: "Cobros" },
      { label: "Cuotas Extraordinarias", href: "/reporte-cuotas-extraordinarias", icon: HandCoins, requiredModule: "Cobros" },
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

export const SIDEBAR_WIDTH_EXPANDED = 264;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

/** Altura del bloque de marca. Colapsado usa el emblema dorado compacto. */
const BRAND_HEIGHT = { expanded: 142, collapsed: 68 } as const;

export function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion
// ─────────────────────────────────────────────────────────────────────────────

const EASE_SMOOTH = [0.32, 0.72, 0, 1] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Contexto interno (evita perforar props por 4 niveles)
// ─────────────────────────────────────────────────────────────────────────────

type SidebarCtxValue = {
  /** Ancho visual efectivo: colapsado y SIN peek de hover. */
  collapsed: boolean;
  currentPath: string;
  openMenus: string[];
  toggleMenu: (label: string) => void;
  reduce: boolean;
  onNavigate: () => void;
};

const SidebarCtx = createContext<SidebarCtxValue | null>(null);

function useSidebarCtx() {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("Sidebar subcomponents must render inside <SidebarProvider>");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Piezas atómicas
// ─────────────────────────────────────────────────────────────────────────────

/** Etiqueta que se desvanece al colapsar y entra con un leve retardo al expandir. */
function ItemLabel({ children, className }: { children: ReactNode; className?: string }) {
  const { reduce } = useSidebarCtx();
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -6 }}
      transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE_SMOOTH, delay: 0.04 }}
      className={cn("min-w-0 flex-1 truncate text-left", className)}
    >
      {children}
    </motion.span>
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
        "flex min-h-[32px] items-center rounded-lg px-2.5 py-1 text-[12px] transition-standard",
        isActive
          ? "bg-[#e5c58d] font-bold text-[#1f2f37] shadow-xs"
          : "font-medium text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className="truncate">{sub.label}</span>
    </Link>
  );
}

function BranchRow({ item, visibleSubs }: { item: NavItem; visibleSubs: NavSubItem[] }) {
  const { collapsed, currentPath, openMenus, toggleMenu, reduce } = useSidebarCtx();

  const isOpen = openMenus.includes(item.label);
  const hasActiveChild = visibleSubs.some((s) => normalizePath(s.href) === currentPath);
  const IconCmp = item.icon;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => toggleMenu(item.label)}
        aria-label={item.label}
        aria-expanded={isOpen}
        title={item.label}
        className={cn(
          "mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-standard",
          hasActiveChild
            ? "bg-[#e5c58d] text-[#1f2f37] shadow-xs"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        <IconCmp style={{ width: 17, height: 17 }} strokeWidth={1.65} />
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
          "group flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-2 py-1.5",
          "text-[12.5px] font-semibold shadow-xs transition-standard",
          isOpen || hasActiveChild
            ? "bg-[#fbf6ea] text-[#1f2f37] ring-1 ring-[#d0b685]/80"
            : "bg-white text-[#1f2f37] hover:bg-[#f6f8fa]"
        )}
      >
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#304854] transition-standard",
            isOpen || hasActiveChild ? "text-[#eed5a4]" : "text-white"
          )}
        >
          <IconCmp style={{ width: 14, height: 14 }} strokeWidth={1.75} />
        </span>
        <ItemLabel>{item.label}</ItemLabel>
        <motion.span
          className={cn(
            "mr-0.5 shrink-0 transition-colors",
            isOpen ? "text-[#304854]" : "text-[#304854]/60"
          )}
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
                : { height: { duration: 0.24, ease: EASE_SMOOTH }, opacity: { duration: 0.16 } }
            }
            className="overflow-hidden"
          >
            <div className="mb-2 ml-3.5 mt-1.5 space-y-1 border-l border-[#d0b685]/45 pl-3">
              {visibleSubs.map((sub, i) => (
                <motion.div
                  key={sub.href}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_SMOOTH, delay: 0.02 + i * 0.02 }
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
  const IconCmp = item.icon;

  const rowClass = cn(
    "transition-standard",
    collapsed
      ? cn(
          "mx-auto flex h-10 w-10 items-center justify-center rounded-xl",
          isActive
            ? "bg-[#e5c58d] font-bold text-[#1f2f37] shadow-xs"
            : "bg-white/10 text-white hover:bg-white/20"
        )
      : cn(
          "flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-[12.5px]",
          isActive
            ? "border border-[#eed7ad]/70 bg-gradient-to-r from-[#dfbe84] to-[#ecd2a2] font-bold text-[#1f2f37] shadow-sm"
            : "bg-white font-semibold text-[#1f2f37] shadow-xs hover:bg-[#f6f8fa]"
        )
  );

  const inner = (
    <>
      <span
        className={cn(
          collapsed
            ? "flex items-center justify-center"
            : cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#304854]",
                isActive ? "text-[#eed5a4]" : "text-white"
              )
        )}
      >
        <IconCmp
          className="shrink-0 transition-standard"
          style={{ width: collapsed ? 17 : 14, height: collapsed ? 17 : 14 }}
          strokeWidth={1.75}
        />
      </span>
      <AnimatePresence initial={false}>
        {!collapsed && <ItemLabel>{item.label}</ItemLabel>}
      </AnimatePresence>
    </>
  );

  return (
    <div>
      {isLogout ? (
        <button
          type="button"
          onClick={() => {
            onNavigate();
            window.location.href = "/logout";
          }}
          aria-label={collapsed ? item.label : undefined}
          title={collapsed ? item.label : undefined}
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
          title={collapsed ? item.label : undefined}
          className={rowClass}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuerpo del sidebar
// ─────────────────────────────────────────────────────────────────────────────

function SidebarSections() {
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
      return { title: section.title, items };
    }).filter((s) => s.items.length > 0);
  }, [permissions]);

  return (
    <nav
      className={cn(
        "sidebar-scrollbar flex-1 overflow-y-auto overflow-x-hidden",
        collapsed ? "space-y-3 px-2 py-3" : "space-y-4 px-3 py-3.5"
      )}
    >
      {sections.map((section) => (
        <div key={section.title}>
          {!collapsed ? (
            <p className="mb-2 flex items-center gap-1.5 px-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b9c7ce]/80">
              <span className="font-extrabold text-[#d0b685]/85">+</span>
              <span>{section.title}</span>
            </p>
          ) : (
            <div className="mx-auto mb-2 w-5 border-t border-white/15" />
          )}
          <div className={collapsed ? "space-y-2" : "space-y-1.5"}>
            {section.items.map(({ item, subs }) =>
              subs.length > 0 ? (
                <BranchRow key={item.label} item={item} visibleSubs={subs} />
              ) : (
                <LeafRow key={item.label} item={item} />
              )
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarSearch({ onOpenSearch, showShortcut = true }: { onOpenSearch: () => void; showShortcut?: boolean }) {
  const { collapsed } = useSidebarCtx();

  return (
    <div className={cn("shrink-0 pt-1", collapsed ? "px-2 pb-2" : "px-3 pb-2.5")}>
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Buscar"
        title={collapsed ? "Buscar (⌘K)" : undefined}
        className={cn(
          "flex w-full items-center rounded-xl border border-white/15 bg-[#243741]",
          "text-white/70 transition-standard hover:bg-[#2a404c] hover:text-white",
          collapsed ? "h-10 justify-center" : "h-9 gap-2.5 px-3"
        )}
      >
        <Search style={{ width: 14, height: 14 }} strokeWidth={1.75} className="shrink-0 text-white/55" />
        <AnimatePresence initial={false}>
          {!collapsed && <ItemLabel className="text-[12.5px] font-normal text-white/65">Buscar...</ItemLabel>}
        </AnimatePresence>
        {!collapsed && showShortcut && (
          <kbd className="hidden items-center gap-px rounded border border-white/15 bg-[#304854] px-1.5 py-0.5 font-sans text-[10px] font-semibold text-white/65 sm:inline-flex">
            ⌘K
          </kbd>
        )}
      </button>
    </div>
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
  const lowerLogoUrl = navbarLogoUrl?.toLowerCase() ?? "";
  const hasCustomLogo = Boolean(
    navbarLogoUrl &&
      !lowerLogoUrl.includes("valquirico") &&
      !lowerLogoUrl.includes("insulae") &&
      !lowerLogoUrl.includes("insuale")
  );
  const [expandedSrc, setExpandedSrc] = useState<string>(
    hasCustomLogo && navbarLogoUrl ? navbarLogoUrl : "/brand/valquirico-stacked-gold.png"
  );
  const [collapsedSrc, setCollapsedSrc] = useState<string>(
    hasCustomLogo && navbarLogoUrl ? navbarLogoUrl : "/brand/valquirico-emblem-gold.png"
  );

  useEffect(() => {
    setExpandedSrc(hasCustomLogo && navbarLogoUrl ? navbarLogoUrl : "/brand/valquirico-stacked-gold.png");
    setCollapsedSrc(hasCustomLogo && navbarLogoUrl ? navbarLogoUrl : "/brand/valquirico-emblem-gold.png");
  }, [hasCustomLogo, navbarLogoUrl]);

  return (
    <motion.div
      className="flex shrink-0 items-center justify-center overflow-hidden border-b border-white/10 px-3"
      animate={{ height: collapsed ? BRAND_HEIGHT.collapsed : BRAND_HEIGHT.expanded }}
      transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_SMOOTH }}
    >
      <Link
        href="/"
        onClick={onNavigate}
        aria-label={navbarLogoAlt}
        className="flex w-full min-w-0 flex-col items-center justify-center transition-opacity duration-150 hover:opacity-90"
      >
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.span
              key="emblem"
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
              transition={reduce ? { duration: 0 } : { duration: 0.16, ease: EASE_SMOOTH }}
              className="flex items-center justify-center"
            >
              <Image
                src={collapsedSrc}
                alt={navbarLogoAlt}
                width={266}
                height={266}
                unoptimized
                onError={() => setCollapsedSrc("/brand/valquirico-emblem-gold.png")}
                className="h-9 w-9 object-contain"
              />
            </motion.span>
          ) : (
            <motion.span
              key="lockup"
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE_SMOOTH }}
              className="flex w-full flex-col items-center gap-3"
            >
              <Image
                src={expandedSrc}
                alt={navbarLogoAlt}
                width={787}
                height={423}
                unoptimized
                onError={() => setExpandedSrc("/brand/valquirico-stacked-gold.png")}
                className="h-[74px] w-auto max-w-[180px] shrink-0 object-contain"
              />
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#fbf6ea] px-3 py-1 text-[9.5px] font-extrabold uppercase leading-none tracking-[0.14em] text-[#1f2f37] shadow-xs ring-1 ring-[#d0b685]/40">
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
}: {
  userName: string;
  initials: string;
}) {
  const { collapsed } = useSidebarCtx();

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border-t border-white/10 bg-[#283d48]",
        collapsed ? "flex justify-center p-2" : "px-3 py-3"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          title={collapsed ? userName : undefined}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d0b685] text-[11px] font-extrabold text-[#1f2f37] shadow-xs"
        >
          {initials}
        </span>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: EASE_SMOOTH, delay: 0.04 }}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-[12px] font-bold leading-tight text-white">{userName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase leading-tight tracking-wider text-white/65">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>Sesión activa</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarCollapseFooter({
  collapsed,
  isPinnedCollapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  isPinnedCollapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center border-t border-white/10 bg-[#253943] px-3 py-2",
        collapsed ? "justify-center" : "justify-end"
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={isPinnedCollapsed ? "Expandir menú" : "Colapsar menú"}
        aria-expanded={!isPinnedCollapsed}
        title={isPinnedCollapsed ? "Expandir menú" : "Colapsar menú"}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-[#304854]/80 text-white/65 transition-standard hover:bg-white/15 hover:text-white active-scale"
      >
        {isPinnedCollapsed ? (
          <ChevronRight style={{ width: 14, height: 14 }} />
        ) : (
          <ChevronLeft style={{ width: 14, height: 14 }} />
        )}
      </button>
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
  onNavigate,
  children,
}: {
  collapsed: boolean;
  onNavigate: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || "/");
  const reduce = useReducedMotion() ?? false;
  const { openMenus, toggleMenu } = useOpenMenus(currentPath);

  const value = useMemo<SidebarCtxValue>(
    () => ({ collapsed, currentPath, openMenus, toggleMenu, reduce, onNavigate }),
    [collapsed, currentPath, openMenus, toggleMenu, reduce, onNavigate]
  );

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

/**
 * Hover-to-peek: con el rail fijado en colapsado, pasar el cursor lo despliega
 * temporalmente SOBRE el contenido (nunca empujándolo).
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

  const expanded = !isCollapsed || isPeeked;
  const railWidth = expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <SidebarProvider collapsed={!expanded} onNavigate={closeNow}>
      <aside
        style={{ width: railWidth }}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocusCapture={openNow}
        onBlurCapture={close}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-black/15 bg-[#304854] lg:flex",
          "transition-[width,box-shadow] duration-[260ms] ease-smooth",
          isPeeked && "shadow-nav-flyout"
        )}
      >
        <SidebarBrand navbarLogoUrl={chrome.navbarLogoUrl} navbarLogoAlt={chrome.navbarLogoAlt} />
        <SidebarSections />
        <SidebarSearch onOpenSearch={chrome.onOpenSearch} />
        <SidebarUser userName={chrome.userName} initials={chrome.userInitials} />
        <SidebarCollapseFooter
          collapsed={!expanded}
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
            className="absolute inset-0 bg-[#1f2f37]/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={reduce ? { opacity: 0 } : { x: "-100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "-100%" }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42, mass: 0.9 }
            }
            className="absolute inset-y-0 left-0 flex w-[264px] flex-col overflow-hidden border-r border-black/15 bg-[#304854] shadow-nav-flyout"
          >
            <SidebarProvider collapsed={false} onNavigate={onClose}>
              <div className="relative">
                <SidebarBrand
                  navbarLogoUrl={chrome.navbarLogoUrl}
                  navbarLogoAlt={chrome.navbarLogoAlt}
                />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar menú"
                  className="absolute right-2.5 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/75 transition-standard hover:bg-white/10 hover:text-white active:scale-90"
                >
                  <X style={{ width: 16, height: 16 }} strokeWidth={2} />
                </button>
              </div>
              <SidebarSections />
              <SidebarSearch
                showShortcut={false}
                onOpenSearch={() => {
                  onClose();
                  chrome.onOpenSearch();
                }}
              />
              <SidebarUser userName={chrome.userName} initials={chrome.userInitials} />
            </SidebarProvider>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
