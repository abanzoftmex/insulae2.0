"use client";

/**
 * Shell del portal de condóminos, al estilo de Slack (docs/minisitio-design-system.md):
 *
 * - El marco (chrome-strong) lleva el color de la marca, olivo de noche; sobre él flotan dos
 *   paneles con radio de 8 px y 4 px de aire: la barra lateral (chrome) y el contenido (blanco).
 * - Barra superior con historial, "Buscar o ir a…" (Ctrl/⌘ K) y la cuenta.
 * - En escritorio el scroll vive dentro del panel de contenido; en el celular, en la ventana,
 *   con barra de pestañas abajo y el menú completo en una hoja.
 *
 * También: cierre de sesión por inactividad y modal del aviso de privacidad. La sesión se
 * verifica en el servidor (requireCondominoSession en cada página); el shell solo pinta.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, ArrowRight, Menu, Phone, Search } from "lucide-react";
import { logoutAction } from "@/app/(minisitio)/minisitio/_actions/auth";
import type { SidebarData } from "@/modules/minisitio/infrastructure/queries/sidebar.queries";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { esAvisoNuevo, useMinisitioNavStore } from "@/stores/minisitio-nav.store";
import { useMinisitioSession } from "./session-provider";
import { useInactivityLogout } from "./use-inactivity-logout";
import PrivacyNoticeModal from "./privacy-notice-modal";
import { CONTENT_ID, msPath, stripMinisitioBase } from "./paths";
import { buildNavModel, resolveRouteTitle, type NavItem } from "./shell/nav-config";
import { Sidebar } from "./shell/sidebar";
import { CommandPalette } from "./shell/command-palette";
import { AccountMenu } from "./shell/account-menu";
import { MobileSheet, MobileTabBar } from "./shell/mobile-nav";
import { Toaster } from "./ui/toaster";

const chromeButton =
  "inline-flex h-7 w-7 items-center justify-center rounded-ctrl text-chrome-ink-soft outline-none hover:bg-chrome-hover hover:text-chrome-ink active:bg-chrome-pressed focus-visible:ring-2 focus-visible:ring-chrome-focus";

function WorkspaceHeader() {
  return (
    <Link
      href={msPath("/")}
      className="mx-2 mt-2 mb-1 flex h-12 shrink-0 items-center gap-2.5 rounded-panel px-2 outline-none hover:bg-chrome-hover focus-visible:ring-2 focus-visible:ring-chrome-focus"
    >
      <Image src="/logo-mono.png" alt="" width={30} height={31} className="h-[30px] w-auto shrink-0" priority />
      <span className="min-w-0">
        <span className="block truncate text-[17px] leading-6 font-bold tracking-[-0.01em] text-chrome-ink">Val&apos;Quirico</span>
        <span className="block truncate text-caption text-chrome-label">Portal del condómino</span>
      </span>
    </Link>
  );
}

export function MinisitioShell({
  children,
  privacyNotice = "",
  sidebar,
}: {
  children: React.ReactNode;
  /** Texto del aviso de privacidad (solo se usa si el condómino no lo ha aceptado). */
  privacyNotice?: string;
  sidebar: SidebarData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const path = stripMinisitioBase(pathname);
  const { user, userType, hasPropiedades, hasComerciosArrendamientos } = useMinisitioSession();
  const clearData = useMinisitioStore((s) => s.clearData);
  const override = useMinisitioLayoutStore((s) => s.override);
  const secondaryOpen = useMinisitioLayoutStore((s) => s.secondaryOpen);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(Boolean(user && !user.aceptoAvisoPrivacidad));
  const [isMac, setIsMac] = useState(false);
  // Momento del montaje: lo que depende de localStorage o del reloj se calcula después, para
  // que el primer render coincida con el HTML del servidor.
  const [mountedAt, setMountedAt] = useState<number | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const userId = user?.id ?? null;
  const avisoVisto = useMinisitioNavStore((s) => (userId ? s.avisosVistos[userId] : undefined));
  const enAvisos = /^\/comunicados(\/|$)/.test(path);

  // Preferencias persistidas: se rehidratan tras montar para que el primer render coincida
  // con el HTML del servidor. Layout effect: corre antes que los efectos de las páginas.
  useLayoutEffect(() => {
    useMinisitioStore.persist.rehydrate();
    useMinisitioNavStore.persist.rehydrate();
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    setMountedAt(Date.now());
  }, []);

  // "Avisos" va en negrita si hay uno más nuevo que el último visto. Entrar a Avisos los da por
  // vistos (lo hace la propia pantalla, después de calcular cuáles marcar como nuevos).
  const avisosNoLeidos = mountedAt !== null && !enAvisos && esAvisoNuevo(sidebar.ultimoAviso, avisoVisto, mountedAt);

  // Cierre de sesión tras 30 minutos sin actividad.
  useInactivityLogout();

  const model = useMemo(
    () => buildNavModel({ userType, hasPropiedades, hasComercios: hasComerciosArrendamientos, sidebar, avisosNoLeidos }),
    [userType, hasPropiedades, hasComerciosArrendamientos, sidebar, avisosNoLeidos],
  );

  // Título del encabezado: el que fijó la página para ESTA ruta o el de la ruta.
  const overrideActive = override && override.pathname === pathname;
  const pageTitle = (overrideActive && override.title) || resolveRouteTitle(path);
  const breadcrumbs = (overrideActive ? override.breadcrumbs : []).filter((crumb) => crumb.label?.trim());
  const trail = breadcrumbs.filter((crumb) => crumb.label !== pageTitle);

  useEffect(() => {
    document.title = `${pageTitle} | Val'Quirico`;
  }, [pageTitle]);

  // Al cambiar de pantalla: cerrar la hoja y volver al inicio del panel de contenido.
  useEffect(() => {
    setSheetOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Ctrl/⌘ K abre "Buscar o ir a…" desde cualquier pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutAction();
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      clearData();
      router.push(msPath("/login"));
    }
  }, [clearData, router]);

  const onSelect = useCallback(
    (item: NavItem) => {
      setPaletteOpen(false);
      if (item.external) window.open(item.href, "_blank", "noopener,noreferrer");
      else router.push(msPath(item.href));
    },
    [router],
  );

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  return (
    <MotionConfig reducedMotion="user">
      <a
        href={`#${CONTENT_ID}`}
        className="sr-only z-[70] rounded-ctrl bg-surface px-3 py-2 text-body font-semibold text-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <div className="flex min-h-dvh flex-col bg-chrome-strong text-fg lg:h-dvh lg:min-h-0">
        {/* Barra superior */}
        <header className="sticky top-0 z-40 flex h-[52px] shrink-0 items-center gap-2 bg-chrome-strong px-2 text-chrome-ink lg:static lg:h-11">
          <button type="button" onClick={() => setSheetOpen(true)} aria-label="Abrir menú" className={`${chromeButton} h-10 w-10 lg:hidden`}>
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-body-lg font-semibold lg:hidden">{pageTitle}</h1>

          <div className="hidden w-[260px] shrink-0 items-center gap-1 pl-1 lg:flex">
            <button type="button" onClick={() => router.back()} aria-label="Atrás" title="Atrás" className={chromeButton}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" onClick={() => router.forward()} aria-label="Adelante" title="Adelante" className={chromeButton}>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-haspopup="dialog"
              className="flex h-[26px] w-full max-w-[640px] items-center gap-2 rounded-surface bg-chrome-field px-2 text-[13px] leading-[22px] text-chrome-ink outline-none hover:bg-chrome-field-hover focus-visible:ring-2 focus-visible:ring-chrome-focus"
            >
              <Search className="h-[18px] w-[18px] shrink-0 text-chrome-ink-soft" aria-hidden />
              <span className="flex-1 truncate text-left">Buscar o ir a…</span>
              <kbd className="font-sans text-caption text-chrome-label">{isMac ? "⌘K" : "Ctrl K"}</kbd>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1 lg:w-[260px] lg:justify-end lg:pr-1">
            <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Buscar o ir a" className={`${chromeButton} h-10 w-10 lg:hidden`}>
              <Search className="h-5 w-5" aria-hidden />
            </button>
            {/* También en el celular: emergencias a un toque desde cualquier pantalla. */}
            <Link
              href={msPath("/campos-contacto")}
              aria-label="Teléfonos de emergencia"
              title="Teléfonos de emergencia"
              className={`${chromeButton} max-lg:h-10 max-lg:w-10`}
            >
              <Phone className="h-5 w-5 lg:h-4 lg:w-4" aria-hidden />
            </Link>
            <AccountMenu
              user={user}
              onLogout={handleLogout}
              triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-ctrl outline-none hover:bg-chrome-hover focus-visible:ring-2 focus-visible:ring-chrome-focus lg:h-7 lg:w-7"
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-1 lg:px-1 lg:pb-1">
          {/* Barra lateral (escritorio) */}
          <aside className="hidden w-[260px] shrink-0 flex-col overflow-hidden rounded-panel bg-chrome shadow-panel lg:flex">
            <WorkspaceHeader />
            <Sidebar model={model} path={path} />
          </aside>

          {/* Contenido */}
          <main
            ref={mainRef}
            id={CONTENT_ID}
            tabIndex={-1}
            className={`flex min-w-0 flex-1 flex-col bg-surface outline-none transition-[margin] duration-fast max-lg:pb-[calc(56px+env(safe-area-inset-bottom))] lg:overflow-y-auto lg:rounded-panel lg:shadow-panel ${
              // Vista secundaria abierta: 400 px de panel + 4 px de aire, como en Slack.
              secondaryOpen ? "lg:mr-[404px]" : ""
            }`}
          >
            <div className="sticky top-0 z-20 hidden h-[49px] shrink-0 items-center gap-2 border-b border-stroke-3 bg-surface pr-4 pl-[18px] lg:flex">
              {trail.length > 0 && (
                <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-body text-fg-3">
                  {trail.map((crumb, index) => (
                    <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                      {crumb.href ? (
                        <Link href={crumb.href} className="truncate rounded-ctrl outline-none hover:text-fg hover:underline focus-visible:ring-2 focus-visible:ring-brand">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="truncate">{crumb.label}</span>
                      )}
                      <span aria-hidden>/</span>
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="min-w-0 truncate text-[18px] leading-6 font-bold tracking-[-0.012em] text-fg">{pageTitle}</h1>
            </div>
            <div className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>

      <MobileTabBar path={path} solicitudes={sidebar.solicitudesAbiertas} onOpenMenu={() => setSheetOpen(true)} menuOpen={sheetOpen} />
      <MobileSheet open={sheetOpen} onClose={closeSheet}>
        <WorkspaceHeader />
        <Sidebar model={model} path={path} onNavigate={closeSheet} pillId="ms-nav-pill-sheet" />
      </MobileSheet>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} model={model} onSelect={onSelect} />
      <Toaster />

      {showPrivacyModal && (
        <PrivacyNoticeModal
          notice={privacyNotice}
          onAccept={() => setShowPrivacyModal(false)}
          onCancel={async () => {
            setShowPrivacyModal(false);
            await handleLogout();
          }}
        />
      )}
    </MotionConfig>
  );
}

export default MinisitioShell;
