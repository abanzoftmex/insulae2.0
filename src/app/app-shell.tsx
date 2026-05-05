"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Users,
  FileText,
  MapPin,
  BookOpen,
  Settings,
  Ticket,
  TrendingUp,
  TrendingDown,
  PieChart,
  ClipboardList,
  AlertCircle,
  Home,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useHydratedSidebar } from "@/stores/ui-sidebar.store";
import { cn } from "@/shared/utils/cn";
import { SearchModal } from "@/components/ui/search-modal";

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon | ElementType;
  items?: { label: string; href: string }[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Gestión",
    items: [
      { label: "Inicio", href: "/", icon: Home },
      {
        label: "Condominio",
        icon: Settings,
        items: [
          { label: "Configuración", href: "/condominio" },
          { label: "Información", href: "/reporte-condominio" },
          { label: "Estructura", href: "/estructura-condominal" },
        ],
      },
      { label: "Directorio", href: "/directorio", icon: BookOpen },
      { label: "Contactos", href: "/contactos", icon: Users },
      { label: "Documentos", href: "/reglamentos", icon: FileText },
    ],
  },
  {
    title: "Operación",
    items: [
      {
        label: "Áreas Privativas",
        icon: MapPin,
        items: [
          { label: "Listado", href: "/areas-privativas" },
          { label: "Seguridad", href: "/listado-seguridad" },
          { label: "Barrios", href: "/listado-zonas" },
          { label: "Usos de Suelo", href: "/listado-usos-suelo" },
        ],
      },
      {
        label: "Atención",
        icon: Ticket,
        items: [
          { label: "Tickets", href: "/tickets" },
          { label: "Departamentos", href: "/departamentos-tickets" },
          { label: "Notificaciones", href: "/notificaciones" },
          { label: "Categorías", href: "/categorias-notificacion" },
        ],
      },
    ],
  },
  {
    title: "Gobernanza",
    items: [
      { label: "Convocatorias", href: "/gobernanza/convocatorias", icon: ClipboardList },
    ],
  },
  {
    title: "Condómino",
    items: [
      { label: "Mis convocatorias", href: "/condomino/mis-convocatorias", icon: FileText },
    ],
  },
  {
    title: "Financiero",
    items: [
      { label: "Resumen", href: "/resumen-financiero", icon: PieChart },
      {
        label: "Ingresos",
        icon: TrendingUp,
        items: [
          { label: "Listado", href: "/listado-ingresos" },
          { label: "Estructura", href: "/listado-estructura-otros-ingresos" },
          { label: "Cobros Masivos", href: "/cobros-masivos" },
        ],
      },
      {
        label: "Egresos",
        icon: TrendingDown,
        items: [
          { label: "Gastos", href: "/listado-gastos" },
          { label: "Presupuestos", href: "/presupuestos" },
          { label: "Estructura Pres.", href: "/listado-estructura-presupuesto" },
        ],
      },
      { label: "Cuotas", href: "/reporte-cuotas", icon: ClipboardList },
      { label: "Cuotas Extra.", href: "/reporte-cuotas-extraordinarias", icon: ClipboardList },
      { label: "Sanciones", href: "/sanciones", icon: AlertCircle },
      { label: "Roles", href: "/listado-roles", icon: Users },
    ],
  },
  {
    title: "Seguridad",
    items: [
      { label: "Cambiar contraseña", href: "/cambio-contrasena", icon: Settings },
    ],
  },
];

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function AppShell({
  children,
  navbarLogoAlt = "Val'Quirico",
}: {
  children: React.ReactNode;
  navbarLogoUrl?: string | null;
  navbarLogoAlt?: string;
}) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || "/");
  const { isCollapsed, isMobileOpen, toggleCollapsed, openMobile, closeMobile } =
    useHydratedSidebar();

  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMenu = (label: string) =>
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );

  // Auto-expand parent of active route
  const activeParents = useMemo(() => {
    const parents: string[] = [];
    for (const section of NAV_SECTIONS)
      for (const item of section.items)
        if (item.items?.some((sub) => normalizePath(sub.href) === currentPath))
          parents.push(item.label);
    return parents;
  }, [currentPath]);

  useEffect(() => {
    setOpenMenus((prev) => {
      const merged = Array.from(new Set([...prev, ...activeParents]));
      return merged.length === prev.length && merged.every((v) => prev.includes(v))
        ? prev
        : merged;
    });
  }, [activeParents]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isMobileOpen || isSearchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen, isSearchOpen]);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─── Nav item renderer ───────────────────────────────────────────────────────

  const renderNavItem = (item: NavItem) => {
    const isActive = item.href ? currentPath === normalizePath(item.href) : false;
    const hasSubmenu = !!item.items?.length;
    const isOpen = openMenus.includes(item.label);
    const Icon = item.icon;

    // Expanded submenu
    if (hasSubmenu && !isCollapsed) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleMenu(item.label)}
            className={cn(
              "w-full flex items-center h-10 px-3 rounded-lg text-[14px] font-medium text-ink",
              "hover:bg-[#f5f4f0] transition-standard group",
              isOpen && "text-brand"
            )}
          >
            <Icon
              className={cn(
                "shrink-0 text-ink-soft group-hover:text-brand transition-standard",
                isOpen && "text-brand"
              )}
              style={{ width: 17, height: 17 }}
              strokeWidth={1.5}
            />
            <span className="ml-2.5 flex-1 text-left truncate">{item.label}</span>
            <ChevronDown
              className={cn(
                "shrink-0 text-ink-soft/50 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              style={{ width: 13, height: 13 }}
            />
          </button>
          {isOpen && (
            <div className="ml-4 pl-3 border-l border-line mt-0.5 mb-1 space-y-0.5">
              {item.items?.map((sub) => {
                const isSubActive = currentPath === normalizePath(sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={cn(
                      "flex items-center h-8 px-2.5 rounded-md text-[13px] transition-standard",
                      isSubActive
                        ? "bg-brand-mint/30 text-brand font-semibold"
                        : "text-ink-soft hover:text-ink hover:bg-[#f5f4f0]"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Collapsed submenu — icon + tooltip
    if (hasSubmenu && isCollapsed) {
      return (
        <div key={item.label} className="relative group/tip">
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center justify-center h-10 rounded-lg text-ink-soft hover:bg-[#f5f4f0] hover:text-ink transition-standard"
            aria-label={item.label}
          >
            <Icon style={{ width: 17, height: 17 }} strokeWidth={1.5} />
          </button>
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-brand-deep text-white text-[12px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50">
            {item.label}
          </div>
        </div>
      );
    }

    // Regular link
    return (
      <div key={item.label} className={cn("relative", isCollapsed && "group/tip")}>
        <Link
          href={item.href || "#"}
          className={cn(
            "flex items-center h-10 rounded-lg transition-standard",
            isCollapsed ? "justify-center px-0" : "px-3",
            isActive
              ? "bg-[#f2f0eb] text-brand font-semibold"
              : "text-ink hover:bg-[#f5f4f0]"
          )}
          aria-label={isCollapsed ? item.label : undefined}
        >
          {isActive && !isCollapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-accent rounded-full" />
          )}
          <Icon
            className={cn(
              "shrink-0 transition-standard",
              isActive ? "text-brand" : "text-ink-soft"
            )}
            style={{ width: 17, height: 17 }}
            strokeWidth={1.5}
          />
          {!isCollapsed && (
            <span className="ml-2.5 text-[14px] truncate">{item.label}</span>
          )}
        </Link>
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-brand-deep text-white text-[12px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50">
            {item.label}
          </div>
        )}
      </div>
    );
  };

  // ─── Shared sidebar content ──────────────────────────────────────────────────

  const sidebarContent = (
    <>
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-line shrink-0",
          isCollapsed ? "h-[52px] justify-center" : "h-[52px] px-4"
        )}
      >
        <Link href="/" className="flex items-center min-w-0">
          {isCollapsed ? (
            <span className="font-black text-brand text-base">I</span>
          ) : (
            <span className="font-black text-brand text-[16px] tracking-tight">INSULAE</span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-x-hidden overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-soft/40">
                {section.title}
              </p>
            )}
            {isCollapsed && <div className="mx-auto w-4 border-t border-line/50 mb-1.5" />}
            <div className="space-y-0.5">
              {section.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        ))}
      </nav>

      {/* Search button */}
      <div className="shrink-0 px-2 pb-2">
        <button
          onClick={() => setIsSearchOpen(true)}
          className={cn(
            "w-full flex items-center rounded-lg border border-line bg-canvas/60",
            "hover:bg-canvas transition-standard text-ink-soft hover:text-ink",
            isCollapsed ? "h-10 justify-center" : "h-9 px-3 gap-2.5"
          )}
          aria-label="Buscar"
        >
          <Search style={{ width: 14, height: 14 }} strokeWidth={1.5} className="shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-[13px]">Buscar...</span>
              <kbd className="hidden sm:inline-flex items-center gap-px px-1 py-px rounded text-[11px] font-medium text-ink-soft/40 border border-line">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-line p-2">
        <button
          onClick={toggleCollapsed}
          className="w-full h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f4f0] text-ink-soft transition-standard active-scale"
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? (
            <ChevronRight style={{ width: 14, height: 14 }} />
          ) : (
            <ChevronLeft style={{ width: 14, height: 14 }} />
          )}
        </button>
      </div>
    </>
  );

  // ─── Shell ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-canvas font-sans">

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-card border-r border-line",
          "transition-all duration-200 overflow-hidden",
          isCollapsed ? "w-[72px]" : "w-[264px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content — no header */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-200",
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-[264px]"
        )}
      >
        {/* Mobile-only top bar */}
        <div className="lg:hidden sticky top-0 z-30 h-12 bg-card border-b border-line flex items-center px-4 gap-3">
          <button
            onClick={openMobile}
            className="p-1.5 -ml-1 rounded-lg hover:bg-canvas text-ink-soft transition-standard"
            aria-label="Abrir menú"
          >
            <Menu style={{ width: 18, height: 18 }} />
          </button>
          <span className="font-semibold text-brand text-sm">INSULAE</span>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:py-8 lg:px-10 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          isMobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-brand-deep/40 backdrop-blur-sm transition-opacity duration-200",
            isMobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={closeMobile}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[264px] bg-card flex flex-col overflow-hidden",
            "transition-transform duration-200",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-[52px] flex items-center justify-between px-4 border-b border-line shrink-0">
            <span className="font-black text-brand text-[16px]">INSULAE</span>
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft transition-standard"
              aria-label="Cerrar menú"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
            {NAV_SECTIONS.map((s) => (
              <div key={s.title}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-soft/40">
                  {s.title}
                </p>
                <div className="space-y-0.5">
                  {s.items.map((item) => renderNavItem(item))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
