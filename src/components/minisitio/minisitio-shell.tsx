"use client";

/**
 * Shell del portal de condóminos (antes `components/Layout.js` + `AuthProvider.js` del
 * minisitio): barra lateral con el menú por módulos, encabezado con título/breadcrumbs y
 * buscador global, cierre de sesión por inactividad y modal de aviso de privacidad.
 *
 * La verificación de sesión ya no vive aquí: la hacen el middleware y cada página en el
 * servidor (requireCondominoSession), así que el shell solo pinta.
 */
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { logoutAction } from "@/app/(minisitio)/minisitio/_actions/auth";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { useMinisitioSession } from "./session-provider";
import { useInactivityLogout } from "./use-inactivity-logout";
import PrivacyNoticeModal from "./privacy-notice-modal";
import { MinisitioSidebar, RAIL_COLLAPSED, RAIL_EXPANDED } from "./minisitio-sidebar";
import { GlobalSearch } from "./global-search";
import { SearchHitFocus } from "./search-hit";
import { buildNavSections, resolveRouteTitle } from "./nav-config";
import { msPath, stripMinisitioBase } from "./paths";

export type { NavEntry } from "./nav-config";

export function MinisitioShell({
  children,
  showHeader = true,
  noPadding = false,
  privacyNotice = "",
}: {
  children: React.ReactNode;
  showHeader?: boolean;
  noPadding?: boolean;
  /** Texto del aviso de privacidad (solo se usa si el condómino no lo ha aceptado). */
  privacyNotice?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = stripMinisitioBase(pathname);
  const { user, userType, hasPropiedades, hasComerciosArrendamientos } = useMinisitioSession();
  const sidebarCollapsed = useMinisitioStore((s) => s.preferences.sidebarCollapsed);
  const setSidebarCollapsed = useMinisitioStore((s) => s.setSidebarCollapsed);
  const clearData = useMinisitioStore((s) => s.clearData);
  const override = useMinisitioLayoutStore((s) => s.override);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(Boolean(user && !user.aceptoAvisoPrivacidad));

  // Preferencias persistidas (sessionStorage): se rehidratan tras montar para que el primer
  // render coincida con el HTML del servidor. Layout effect (no effect) a propósito: corre
  // antes que los useEffect de las páginas, que escriben al store al montar; si una página
  // escribiera antes de rehidratar, persist guardaría las preferencias por defecto encima
  // de las del usuario.
  useLayoutEffect(() => {
    useMinisitioStore.persist.rehydrate();
  }, []);

  // Cierre de sesión tras 30 minutos sin actividad (antes hooks/useInactivityLogout.js).
  useInactivityLogout();

  // Título del encabezado: el que fijó la página para ESTA ruta o el de la ruta.
  const overrideActive = override && override.pathname === pathname;
  const pageTitle = (overrideActive && override.title) || resolveRouteTitle(currentPath);
  const breadcrumbs = (overrideActive ? override.breadcrumbs : []).filter((crumb) => crumb.label && crumb.label.trim());

  // El cajón del celular se cierra con Esc, como cualquier panel que se superpone, y mientras
  // está abierto la página de atrás no se desplaza.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [mobileMenuOpen]);

  // El encabezado solo proyecta sombra cuando hay contenido pasando por debajo.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Al navegar se cierra el cajón del celular. Se ajusta durante el render (no en un efecto)
  // para que la pantalla nueva no pinte un cuadro con el cajón todavía abierto.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      clearData();
      router.push(msPath("/login"));
    }
  };

  // Handlers del modal de privacidad (antes en AuthProvider.js)
  const handlePrivacyAccept = () => setShowPrivacyModal(false);
  const handlePrivacyCancel = async () => {
    setShowPrivacyModal(false);
    await handleLogout();
  };

  const sections = buildNavSections({
    currentPath,
    userType,
    hasPropiedades,
    hasComercios: hasComerciosArrendamientos,
  });

  // Con el cajón del celular abierto el rail siempre se muestra expandido: la preferencia de
  // colapso es de escritorio.
  const collapsed = sidebarCollapsed && !mobileMenuOpen;

  const userName = user?.nombre || user?.razon_social || "Usuario";
  const userRole = userType === "both" ? "Propietario y Comercio" : userType === "propietario" ? "Propietario" : "Comercio";

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-deep focus:shadow-nav-flyout focus:outline-none focus:ring-2 focus:ring-brand/50"
      >
        Saltar al contenido
      </a>

      {/* Velo del cajón del celular */}
      <div
        aria-hidden
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-brand-deep/40 backdrop-blur-[2px] transition-opacity duration-[260ms] ease-smooth lg:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <MinisitioSidebar
        sections={sections}
        currentPath={currentPath}
        collapsed={collapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
      />

      {/* Contenido */}
      <div
        className="transition-[padding] duration-[260ms] ease-smooth lg:pl-[var(--rail)]"
        style={{ "--rail": `${showHeader ? (sidebarCollapsed ? RAIL_COLLAPSED : RAIL_EXPANDED) : 0}px` } as React.CSSProperties}
      >
        {showHeader && (
          <header
            className={`sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md backdrop-saturate-150 transition-shadow duration-200 ${
              scrolled ? "shadow-[0_1px_3px_rgb(61_60_34/0.08)]" : ""
            }`}
          >
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menú"
                aria-expanded={mobileMenuOpen}
                className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft outline-none transition-colors duration-150 hover:bg-canvas-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Título y migas */}
              <div className="flex min-w-0 flex-1 flex-col">
                {breadcrumbs.length > 0 && (
                  <nav aria-label="Ruta" className="mb-0.5 hidden sm:block">
                    <ol className="flex items-center gap-1 text-[13px] text-ink-soft">
                      {breadcrumbs.map((crumb, index) => (
                        <li key={index} className="flex min-w-0 items-center gap-1">
                          {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-soft/50" aria-hidden />}
                          {crumb.href ? (
                            <Link
                              href={crumb.href}
                              className="truncate rounded outline-none transition-colors duration-150 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50"
                            >
                              {crumb.label}
                            </Link>
                          ) : (
                            <span aria-current="page" className="truncate font-medium text-ink">
                              {crumb.label}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}
                <h1 className="truncate text-xl font-bold tracking-[-0.015em] text-primary-dark sm:text-2xl">{pageTitle}</h1>
              </div>

              <GlobalSearch sections={sections} />
            </div>
          </header>
        )}

        <main id="contenido" className={noPadding ? "" : "p-4 sm:p-6 lg:p-8"}>
          {/* Tope de ancho: en monitores grandes las tarjetas y tablas no se estiran hasta perder la lectura. */}
          <div className={noPadding ? "" : "mx-auto w-full max-w-[1400px]"}>{children}</div>
        </main>
      </div>

      <Suspense fallback={null}>
        <SearchHitFocus />
      </Suspense>

      {showPrivacyModal && (
        <PrivacyNoticeModal notice={privacyNotice} onAccept={handlePrivacyAccept} onCancel={handlePrivacyCancel} />
      )}
    </div>
  );
}

export default MinisitioShell;
