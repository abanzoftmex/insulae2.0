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
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useHydratedSidebar } from "@/stores/ui-sidebar.store";
import { cn } from "@/shared/utils/cn";
import { SearchModal } from "@/components/ui/search-modal";
import { usePermissions } from "@/components/providers/permissions-provider";

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon | ElementType;
  requiredModule?: string;
  items?: { label: string; href: string; requiredModule?: string }[];
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
          { label: "Estadística", href: "/reporte-condominio", requiredModule: "Reporte condominio" },
          { label: "Configuración", href: "/condominio", requiredModule: "Condominio" },
          { label: "Estructura Condominal", href: "/estructura-condominal", requiredModule: "Estructura condominal" },
        ],
      },
      { label: "Directorio de Personas", href: "/directorio", icon: BookOpen, requiredModule: "Directorio" },
      { label: "Directorio de sitios", href: "/contactos", icon: Users, requiredModule: "Contactos" },
      { label: "Reglamentos y Documentos", href: "/reglamentos", icon: FileText, requiredModule: "Reglamentos" },
    ],
  },
  {
    title: "Operación",
    items: [
      {
        label: "Áreas Privativas",
        icon: MapPin,
        items: [
          { label: "Listado", href: "/areas-privativas", requiredModule: "Areas privativas" },
          { label: "Seguridad", href: "/listado-seguridad" },
          { label: "Barrios", href: "/listado-zonas", requiredModule: "Barrios" },
          { label: "Usos de Suelo", href: "/listado-usos-suelo", requiredModule: "Usos de suelo" },
        ],
      },
      {
        label: "Atención",
        icon: Ticket,
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
    title: "Gobernanza",
    items: [
      { label: "Convocatorias", href: "/gobernanza/convocatorias", icon: ClipboardList, requiredModule: "Convocatorias" },
    ],
  },
  {
    title: "Condómino",
    items: [
      { label: "Mis convocatorias", href: "/condomino/mis-convocatorias", icon: FileText, requiredModule: "Convocatorias condómino" },
    ],
  },
  {
    title: "Financiero",
    items: [
      { label: "Resumen", href: "/resumen-financiero", icon: PieChart, requiredModule: "Resumen financiero" },
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
          { label: "Estructura Pres.", href: "/listado-estructura-presupuesto", requiredModule: "Estructura Presupuesto" },
        ],
      },
      { label: "Cuotas", href: "/reporte-cuotas", icon: ClipboardList },
      { label: "Cuotas Extra.", href: "/reporte-cuotas-extraordinarias", icon: ClipboardList },
      { label: "Sanciones", href: "/sanciones", icon: AlertCircle, requiredModule: "Catálogo de sanciones" },
      { label: "Roles", href: "/listado-roles", icon: Users, requiredModule: "Roles" },
    ],
  },
  {
    title: "Seguridad",
    items: [
      { label: "Cambiar contraseña", href: "/cambio-contrasena", icon: Settings },
      { label: "Cerrar sesión", href: "/logout", icon: LogOut },
    ],
  },
];

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function AppShell({
  children,
  navbarLogoUrl = null,
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
  const permissions = usePermissions();

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
                if (sub.requiredModule && !permissions[sub.requiredModule]?.canRead) return null;
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
    if (item.href === "/logout") {
      return (
        <div key={item.label} className={cn("relative", isCollapsed && "group/tip")}>
          <button
            onClick={() => {
              window.location.href = "/logout";
            }}
            className={cn(
              "w-full flex items-center h-10 rounded-lg transition-standard",
              isCollapsed ? "justify-center px-0" : "px-3",
              "text-ink hover:bg-[#f5f4f0]"
            )}
            aria-label={isCollapsed ? item.label : undefined}
          >
            <Icon
              className="shrink-0 transition-standard text-ink-soft"
              style={{ width: 17, height: 17 }}
              strokeWidth={1.5}
            />
            {!isCollapsed && (
              <span className="ml-2.5 text-[14px] truncate">{item.label}</span>
            )}
          </button>
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-brand-deep text-white text-[12px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50">
              {item.label}
            </div>
          )}
        </div>
      );
    }

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
          isCollapsed ? "h-[52px] justify-center" : "px-4 py-3"
        )}
      >
        <Link href="/" className="flex items-center min-w-0">
          {isCollapsed ? (
            navbarLogoUrl ? (
              <img src={navbarLogoUrl} alt={navbarLogoAlt} className="h-8 w-8 object-contain" />
            ) : (
              <span className="font-bold text-brand text-base">I</span>
            )
          ) : (
            <div className="flex flex-col items-center gap-1.5 w-full">
              {navbarLogoUrl && (
                <img src={navbarLogoUrl} alt={navbarLogoAlt} className="h-10 object-contain" />
              )}
              <div className="text-center">
                <span className="font-bold text-brand text-[16px] tracking-tight block">INSULAE</span>
                <span className="text-[10px] font-medium text-ink-soft/60 tracking-wider block">Sistema condominal</span>
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-x-hidden overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map((section) => {
          // Filtrar items basado en permisos
          const visibleItems = section.items.filter(item => {
            if (item.requiredModule && !permissions[item.requiredModule]?.canRead) return false;
            // Si tiene submenus, revisar si tiene al menos un submenu visible, o si el padre tiene permiso
            if (item.items && item.items.length > 0) {
                const visibleSubitems = item.items.filter(sub => !sub.requiredModule || permissions[sub.requiredModule]?.canRead);
                if (visibleSubitems.length === 0) return false; // si no hay subitems visibles, ocultar padre
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
          <div key={section.title}>
            {!isCollapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-soft/70">
                {section.title}
              </p>
            )}
            {isCollapsed && <div className="mx-auto w-4 border-t border-line/50 mb-1.5" />}
            <div className="space-y-0.5">
              {visibleItems.map((item) => renderNavItem(item))}
            </div>
          </div>
          );
        })}
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

  const isLoginPage = currentPath === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

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
          <span className="font-semibold text-brand text-sm truncate">
            INSULAE
            {navbarLogoAlt && (
              <span className="font-normal text-ink-soft/80"> · {navbarLogoAlt}</span>
            )}
          </span>
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <div className="flex flex-col items-start gap-1">
              {navbarLogoUrl && (
                <img src={navbarLogoUrl} alt={navbarLogoAlt} className="h-8 object-contain" />
              )}
              <div>
                <span className="font-bold text-brand text-[16px] block">INSULAE</span>
                <span className="text-[10px] font-medium text-ink-soft/60 tracking-wider block">Sistema condominal</span>
              </div>
            </div>
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg hover:bg-canvas text-ink-soft transition-standard"
              aria-label="Cerrar menú"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
            {NAV_SECTIONS.map((s) => {
               // Filtrar items basado en permisos
               const visibleItems = s.items.filter(item => {
                 if (item.requiredModule && !permissions[item.requiredModule]?.canRead) return false;
                 if (item.items && item.items.length > 0) {
                     const visibleSubitems = item.items.filter(sub => !sub.requiredModule || permissions[sub.requiredModule]?.canRead);
                     if (visibleSubitems.length === 0) return false;
                 }
                 return true;
               });

               if (visibleItems.length === 0) return null;

               return (
                <div key={s.title}>
                  <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-soft/70">
                    {s.title}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => renderNavItem(item))}
                  </div>
                </div>
               );
            })}
          </nav>
        </aside>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
