"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Menu } from "lucide-react";
import { useHydratedSidebar } from "@/stores/ui-sidebar.store";
import { cn } from "@/shared/utils/cn";
import { SearchModal } from "@/components/ui/search-modal";
import {
  DesktopSidebar,
  MobileSidebar,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  normalizePath,
} from "@/components/layout/app-sidebar";

// Pantallas públicas que se renderizan sin sidebar ni navbar.
const BARE_PATHS = new Set(["/login", "/olvide-contrasena", "/restablecer-contrasena"]);

export function AppShell({
  children,
  navbarLogoUrl = null,
  navbarLogoAlt = "Val'Quirico",
  currentUserName = "Usuario Insulae",
}: {
  children: React.ReactNode;
  navbarLogoUrl?: string | null;
  navbarLogoAlt?: string;
  currentUserName?: string;
}) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || "/");
  const { isCollapsed, isMobileOpen, toggleCollapsed, openMobile, closeMobile } =
    useHydratedSidebar();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const userInitials = useMemo(() => {
    const parts = currentUserName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [currentUserName]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isMobileOpen || isSearchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
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

  // Inactivity timeout: 15 minutes of no user interaction redirects to /logout
  useEffect(() => {
    if (BARE_PATHS.has(currentPath)) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window.location.href = "/logout";
      }, 15 * 60 * 1000);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    resetTimer();
    events.forEach((event) => document.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [currentPath]);

  const isLoginPage = BARE_PATHS.has(currentPath);
  const isPrintPage = currentPath.endsWith("/imprimir");
  // Rutas que aprovechan todo el ancho disponible (sin tope centrado de 1440px)
  const isFullWidthPage = currentPath === "/estadisticas";

  if (isLoginPage || isPrintPage) {
    return <>{children}</>;
  }

  const chrome = {
    navbarLogoUrl,
    navbarLogoAlt,
    userName: currentUserName,
    userInitials,
    onOpenSearch: () => setIsSearchOpen(true),
  };

  return (
    // `--sidebar-w` es la única fuente de verdad del ancho: el rail y el padding
    // del contenido lo consumen con la misma curva, así nunca se desincronizan.
    <div
      className="flex min-h-screen bg-canvas font-sans"
      style={
        {
          "--sidebar-w": `${isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px`,
        } as CSSProperties
      }
    >
      <DesktopSidebar isCollapsed={isCollapsed} onToggleCollapsed={toggleCollapsed} {...chrome} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-[260ms] ease-smooth lg:pl-[var(--sidebar-w)]">
        {/* Mobile-only top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-nav-line bg-nav px-4 lg:hidden">
          <button
            onClick={openMobile}
            className="-ml-1.5 rounded-lg p-1.5 text-nav-ink-soft transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep active:scale-90"
            aria-label="Abrir menú"
          >
            <Menu style={{ width: 19, height: 19 }} strokeWidth={2} />
          </button>
          <span className="truncate text-[13px] font-bold tracking-[0.02em] text-brand-deep">
            VAL&apos;QUIRICO
          </span>
          <span className="rounded-full bg-card px-1.5 py-[2px] text-[9px] font-bold uppercase leading-none tracking-[0.12em] text-brand ring-1 ring-nav-line">
            Insulae 2.0
          </span>
        </div>

        <main
          className={cn(
            "w-full flex-1 p-4 md:p-6 lg:px-10 lg:py-8",
            !isFullWidthPage && "mx-auto max-w-[1440px]"
          )}
        >
          {children}
        </main>
      </div>

      <MobileSidebar isOpen={isMobileOpen} onClose={closeMobile} {...chrome} />

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
