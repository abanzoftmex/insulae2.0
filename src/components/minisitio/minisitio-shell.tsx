"use client";

/**
 * Shell del portal de condóminos (antes `components/Layout.js` + `AuthProvider.js` del
 * minisitio): rail lateral con el menú por módulos, encabezado con título/breadcrumbs,
 * cierre de sesión por inactividad y modal de aviso de privacidad.
 *
 * La verificación de sesión ya no vive aquí: la hacen el middleware y cada página en el
 * servidor (requireCondominoSession), así que el shell solo pinta.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  FileText,
  Megaphone,
  User,
  Menu,
  X,
  MailPlus,
  LogOut,
  Settings,
  Sparkles,
  Shield,
  BookOpen,
  Settings2,
  BarChart3,
  Phone,
  Landmark,
  DollarSign,
  ChevronDown,
  Handshake,
  Map,
  House,
  Building2,
  Coins,
  Headset,
  Trees,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logoutAction } from "@/app/(minisitio)/minisitio/_actions/auth";
import { useMinisitioStore } from "@/stores/minisitio.store";
import { useMinisitioLayoutStore } from "@/stores/minisitio-layout.store";
import { useMinisitioSession } from "./session-provider";
import { useInactivityLogout } from "./use-inactivity-logout";
import { Tooltip } from "./tooltip";
import { CollapsedMenu } from "./collapsed-menu";
import PrivacyNoticeModal from "./privacy-notice-modal";
import { msPath, stripMinisitioBase } from "./paths";

export interface NavEntry {
  name: string;
  href?: string;
  icon: LucideIcon;
  current: boolean;
  show?: boolean;
  external?: boolean;
  badge?: string | number;
  children?: NavEntry[];
}

/** Título por defecto de cada pantalla (ruta sin el prefijo /minisitio). */
const ROUTE_TITLES: [RegExp, string][] = [
  [/^\/$/, "Bienvenida"],
  [/^\/dashboard$/, "Dashboard"],
  [/^\/propiedades$/, "Mis Propiedades"],
  [/^\/propiedades\/[^/]+\/estado-cuenta$/, "Estado de Cuenta"],
  [/^\/propiedades\/[^/]+$/, "Propiedad"],
  [/^\/arrendamientos$/, "Mis Comercios"],
  [/^\/arrendamientos\/[^/]+\/estado-cuenta$/, "Estado de Cuenta"],
  [/^\/arrendamientos\/[^/]+$/, "Mis Comercios"],
  [/^\/comunicados$/, "Comunicados"],
  [/^\/notificaciones$/, "Notificaciones"],
  [/^\/experiencias$/, "Experiencias"],
  [/^\/tickets$/, "Solicitudes y reportes"],
  [/^\/mi-perfil$/, "Mi Perfil"],
  [/^\/reglamentos$/, "Documentos Condominales"],
  [/^\/campos-contacto$/, "Números de Emergencia"],
  [/^\/aviso-privacidad$/, "Aviso de Privacidad"],
  [/^\/estado-resultado$/, "Estado de Resultados"],
  [/^\/resumen-financiero$/, "Resumen Financiero"],
  [/^\/reporte-cuotas$/, "Reporte de Cuotas Ordinarias"],
  [/^\/reporte-cuotas-extraordinaria$/, "Reporte de Cuotas Extraordinarias"],
  [/^\/reporte-general$/, "Reporte General"],
];

function resolveRouteTitle(path: string): string {
  return ROUTE_TITLES.find(([re]) => re.test(path))?.[1] ?? "Dashboard";
}

const RAIL_COLLAPSED = 68;
const RAIL_EXPANDED = 268;

/** Proporción del ancho del rail que ocupan los módulos, por estado.
 *  La canaleta se reparte a partes iguales a los dos lados. */
const WELL_RATIO = { expanded: 0.9, collapsed: 0.85 };
const gutterFor = (collapsed: boolean) =>
  collapsed
    ? (RAIL_COLLAPSED * (1 - WELL_RATIO.collapsed)) / 2
    : (RAIL_EXPANDED * (1 - WELL_RATIO.expanded)) / 2;

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
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [collapsedMenuOpen, setCollapsedMenuOpen] = useState(false);
  const [collapsedMenuItem, setCollapsedMenuItem] = useState<NavEntry | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(Boolean(user && !user.aceptoAvisoPrivacidad));

  // Preferencias persistidas (sessionStorage): se rehidratan tras montar para que el primer
  // render coincida con el HTML del servidor.
  useEffect(() => {
    useMinisitioStore.persist.rehydrate();
  }, []);

  // Cierre de sesión tras 30 minutos sin actividad (antes hooks/useInactivityLogout.js).
  useInactivityLogout();

  // Título del encabezado: el que fijó la página para ESTA ruta o el de la ruta.
  const overrideActive = override && override.pathname === pathname;
  const pageTitle = (overrideActive && override.title) || resolveRouteTitle(currentPath);
  const breadcrumbs = overrideActive ? override.breadcrumbs : [];

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleCollapsedMenuClick = (item: NavEntry) => {
    setCollapsedMenuItem(item);
    setCollapsedMenuOpen(true);
  };

  // Limpiar el estado de carga cuando cambie la ruta
  useEffect(() => {
    setLoadingPath(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Función para manejar el clic en navegación
  const handleNavClick = (href: string) => {
    if (pathname !== href) {
      setLoadingPath(href);
    }
  };

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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const navigation: NavEntry[] = ([
    {
      name: "Bienvenida",
      href: msPath("/"),
      icon: Handshake,
      current: currentPath === "/",
    },
    {
      name: 'Panel de Control',
      href: msPath('/dashboard'),
      icon: Settings2,
      current: currentPath === "/dashboard",
    },
    {
      name: 'Mis Propiedades',
      href: msPath('/propiedades'),
      icon: Home,
      current:
        currentPath === "/propiedades" ||
        currentPath.startsWith("/propiedades/"),
      show:
        (userType === "propietario" || userType === "both") && hasPropiedades,
    },
    {
      name: 'Mis Comercios',
      href: msPath('/arrendamientos'),
      icon: Landmark,
      current:
        currentPath === "/arrendamientos" ||
        currentPath.startsWith("/arrendamientos/"),
      show:
        (userType === "arrendatario" || userType === "both") &&
        hasComerciosArrendamientos,
    },
    /* {
      name: 'Reporte General de Cuotas Ordinarias',
      href: msPath('/reporte-general'),
      icon: BarChart3,
      current: currentPath === "/reporte-general",
      show: userType === "propietario" || userType === "both",
    }, */
    {
      name: "Reportes Condominales",
      icon: BarChart3,
      current: currentPath.startsWith("/reporte"),
      show: userType === "propietario" || userType === "both",
      children: [
        {
          name: "Resumen Financiero",
          href: msPath("/resumen-financiero"),
          icon: DollarSign,
          current: currentPath === "/resumen-financiero",
        },
        {
          name: "Reporte de Cuotas Ordinarias",
          href: msPath("/reporte-cuotas"),
          icon: FileText,
          current: currentPath === "/reporte-cuotas",
        },
        {
          name: "Reporte de Cuotas Extraordinarias",
          href: msPath("/reporte-cuotas-extraordinaria"),
          icon: FileText,
          current: currentPath === "/reporte-cuotas-extraordinaria",
        },
      ]
    },
    {
      name: "Comunicados",
      href: msPath("/comunicados"),
      icon: Megaphone,
      current: currentPath === "/comunicados",
    },
    {
      name: "Solicitudes y reportes",
      href: msPath("/tickets"),
      icon: MailPlus,
      current: currentPath === "/tickets",
    },
    {
      name: "Aviso de privacidad",
      href: msPath("/aviso-privacidad"),
      icon: Shield,
      current: currentPath === "/aviso-privacidad",
    },
    {
      name: "Documentos Condominales",
      href: msPath("/reglamentos"),
      icon: BookOpen,
      current: currentPath === "/reglamentos",
    },
    {
      name: "Experiencias Val'Quirico",
      href: msPath("/experiencias"),
      icon: Sparkles,
      current: currentPath === "/experiencias",
    },
    {
      name: "Números de Emergencia",
      href: msPath("/campos-contacto"),
      icon: Phone,
      current: currentPath === "/campos-contacto",
      show: true, // Puedes agregar lógica de permisos aquí si necesitas
    },
    {
      name: "Mostrar el Mapa",
      href: "https://www.mapavalquirico.com/",
      icon: Map,
      current: false,
      external: true,
      show: true,
    },
  ] as NavEntry[]).filter((item) => item.show !== false);

  // Los módulos se definen por NOMBRE para no tocar el array de navegación:
  // `show`, `current` y los permisos siguen siendo su única fuente de verdad.
  // Todo ítem que no aparezca aquí cae en "Más" — así nunca desaparece en
  // silencio si mañana agregan una entrada nueva.
  const NAV_GROUPS = [
    { title: "Inicio", glyph: House, items: ["Bienvenida", "Panel de Control"] },
    { title: "Mi patrimonio", glyph: Building2, items: ["Mis Propiedades", "Mis Comercios"] },
    { title: "Financiero", glyph: Coins, items: ["Reportes Condominales"] },
    { title: "Atención", glyph: Headset, items: ["Comunicados", "Solicitudes y reportes"] },
    {
      title: "Val'Quirico",
      glyph: Trees,
      items: [
        "Documentos Condominales",
        "Aviso de privacidad",
        "Experiencias Val'Quirico",
        "Números de Emergencia",
        "Mostrar el Mapa",
      ],
    },
  ];

  const agrupados = new Set(NAV_GROUPS.flatMap((g) => g.items));
  const navSections = [
    ...NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items
        .map((n) => navigation.find((i) => i.name === n))
        .filter((i): i is NavEntry => Boolean(i)),
    })),
    { title: "Más", glyph: Landmark, items: navigation.filter((i) => !agrupados.has(i.name)) },
  ].filter((g) => g.items.length > 0);

  // Con el drawer móvil abierto el rail siempre se muestra expandido: la
  // preferencia de colapso es de escritorio y en móvil dejaba iconos sin
  // etiqueta dentro de un cajón de 268px.
  const collapsed = sidebarCollapsed && !mobileMenuOpen;

  // Marcador dorado del ítem activo. Los desplazamientos salen de los paddings
  // reales: -6 lo deja a ras de la pared interna del módulo (p-1.5); -11 lo
  // deja sobre la guía vertical del submenú (ml-18 + border-1 + pl-10 = 29).
  const ActiveMark = ({ sub = false }: { sub?: boolean }) => (
    <span
      aria-hidden
      className="absolute top-1/2 -mt-2 h-4 w-[3px] rounded-r-full bg-brand-accent"
      style={{ left: sub ? -11 : collapsed ? -4 : -6 }}
    />
  );

  const SubNavItem = ({ item }: { item: NavEntry }) => (
    <Link href={item.href!} onClick={() => handleNavClick(item.href!)}>
      <span
        className={`group relative flex h-8 items-center gap-2 rounded-md pl-2 pr-2.5 text-[12.5px] transition-colors duration-150 ${
          item.current
            ? "bg-card font-semibold text-brand-deep shadow-nav-item"
            : "text-nav-ink-soft hover:bg-nav-hover hover:text-brand-deep"
        }`}
      >
        {item.current && <ActiveMark sub />}
        <span
          className={`h-1 w-1 shrink-0 rounded-full transition-colors duration-150 ${
            item.current ? "bg-brand-accent" : "bg-nav-ink-faint group-hover:bg-brand"
          }`}
        />
        <span className="truncate">{item.name}</span>
      </span>
    </Link>
  );

  const NavItem = ({ item }: { item: NavEntry }) => {
    const Icon = item.icon;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isExpanded = !!expandedMenus[item.name];
    const hasActiveChild = hasChildren && item.children!.some((c) => c.current);
    const activo = item.current || hasActiveChild;

    const tam = collapsed ? "h-[19px] w-[19px]" : "h-[17px] w-[17px]";
    const iconClass = `${tam} shrink-0 transition-colors duration-150 ${
      activo ? "text-brand-accent" : "text-nav-ink-soft group-hover:text-brand"
    }`;

    if (hasChildren) {
      if (collapsed) {
        return (
          <Tooltip title={item.name} position="right">
            <div
              onClick={() => handleCollapsedMenuClick(item)}
              className={`group relative flex h-9 w-full cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 ${
                activo ? "bg-card shadow-nav-item" : "hover:bg-nav-hover"
              }`}
            >
              {activo && <ActiveMark />}
              <Icon className={iconClass} strokeWidth={activo ? 2 : 1.75} />
            </div>
          </Tooltip>
        );
      }

      return (
        <div>
          <div
            onClick={() => toggleMenu(item.name)}
            className={`group flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep ${
              activo || isExpanded ? "text-brand-deep" : "text-nav-ink"
            }`}
          >
            <Icon
              className={`${tam} shrink-0 transition-colors duration-150 ${
                activo ? "text-brand" : "text-nav-ink-soft group-hover:text-brand"
              }`}
              strokeWidth={1.75}
            />
            <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
            <ChevronDown
              className={`h-[13px] w-[13px] shrink-0 text-nav-ink-soft transition-transform duration-200 group-hover:text-brand-deep ${
                isExpanded ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
          </div>

          {/* Alto animado sin framer-motion: el truco grid 0fr→1fr no requiere
              medir nada en JS y respeta contenido de altura variable. */}
          <div className="submenu-collapsible" data-open={isExpanded ? "true" : "false"}>
            <div>
              <div className="ml-[18px] mt-0.5 mb-1 space-y-0.5 border-l border-nav-line pl-2.5">
                {item.children!.map((child) => (
                  <SubNavItem key={child.name} item={child} />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const fila = (
      <div
        className={`group relative flex h-9 items-center rounded-lg transition-colors duration-150 ${
          collapsed ? "w-full justify-center" : "gap-2.5 px-2.5"
        } ${
          item.current
            ? "bg-card font-semibold text-brand-deep shadow-nav-item"
            : "text-nav-ink hover:bg-nav-hover hover:text-brand-deep"
        }`}
      >
        {item.current && <ActiveMark />}
        <Icon className={iconClass} strokeWidth={item.current ? 2 : 1.75} />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-[13px]">{item.name}</span>
        )}
        {!collapsed && item.badge && (
          <span className="ml-auto rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
      </div>
    );

    return (
      <Link
        href={item.href!}
        onClick={() => handleNavClick(item.href!)}
        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {collapsed ? (
          <Tooltip title={item.name} position="right">
            {fila}
          </Tooltip>
        ) : (
          fila
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-deep/40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — estilo portado de insulae2.0: rail pergamino, módulos
          incrustados y el ítem activo elevándose a blanco. */}
      <div
        style={{ width: collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-nav shadow-nav-rail transition-[width,transform] duration-[260ms] ease-smooth ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Marca. El lockup horizontal es 1077×290: a cualquier altura legible
            desborda un rail de 68px y se recorta. Colapsado usa la versión
            cuadrada (logo-mono.png, 158×164), que es la única que cabe. */}
        <div
          className="relative flex shrink-0 items-center justify-center overflow-hidden border-b border-nav-line-soft px-3 transition-[height] duration-[260ms] ease-smooth"
          style={{ height: collapsed ? 64 : 100 }}
        >
          <Link
            href={msPath("/")}
            aria-label="Val'Quirico"
            className="flex min-w-0 flex-col items-center gap-2 rounded-lg transition-opacity duration-150 hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={collapsed ? "/logo-mono.png" : "/valquirico-logo.png"}
              alt="Val'Quirico"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                if (e.currentTarget.src.indexOf("brand/valquirico-logo-light.png") === -1) {
                  e.currentTarget.src = "/brand/valquirico-logo-light.png";
                }
              }}
              className="w-auto shrink-0 object-contain"
              style={collapsed ? { height: 36, width: 36 } : { height: 52, maxWidth: 188 }}
            />
            {!collapsed && (
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-brand-mint text-brand-deep px-2.5 py-[3px] text-[9px] font-black uppercase leading-none tracking-[0.12em] shadow-xs">
                MINISITIO CONDÓMINOS
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
            className="absolute right-2.5 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-nav-ink-soft transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep active:scale-90 lg:hidden"
          >
            <X className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>

        {/* Navegación en módulos */}
        {/* Los módulos ocupan WELL_RATIO del ancho del rail en ambos estados.
            En colapsado el scroll se oculta porque robaría 10px —más que la
            propia canaleta de 5.1px— y rompería la proporción descentrándolos. */}
        <nav
          className={`scrollbar-hidden flex-1 overflow-y-auto overflow-x-hidden py-3 transition-[padding] duration-[260ms] ease-smooth ${
            collapsed ? "space-y-1.5" : "space-y-2"
          }`}
          style={{
            paddingLeft: gutterFor(collapsed),
            paddingRight: gutterFor(collapsed),
          }}
        >
          {navSections.map((group) => {
            const Glyph = group.glyph;
            return (
              <section
                key={group.title}
                className={`relative bg-nav-sunken shadow-nav-well ${
                  collapsed ? "rounded-lg p-1" : "rounded-xl p-1.5"
                }`}
              >
                {/* Marca de agua de dominio, en capa propia para que se recorte
                    contra la esquina redondeada sin clipear el marcador dorado. */}
                {!collapsed && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
                >
                  <Glyph
                    className="watermark-glyph absolute top-1/2 text-brand-deep/[0.06]"
                    style={{
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
                    {group.title}
                  </p>
                )}
                <div className="relative space-y-px">
                  {group.items.map((item) => (
                    <NavItem key={item.name} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </nav>

        {/* Usuario + acciones */}
        <div
          className={`shrink-0 overflow-hidden border-t border-nav-line-soft bg-nav-sunken/60 ${
            collapsed ? "px-2 py-2.5" : "px-2.5 py-3"
          }`}
        >
          <div
            className={`flex items-center ${collapsed ? "flex-col gap-1.5" : "gap-2.5"}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-nav-item">
              <User className="h-4 w-4" strokeWidth={2} />
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold leading-tight text-brand-deep">
                  {user?.nombre || user?.razon_social || "Usuario"}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-nav-ink-faint">
                  {userType === "both"
                    ? "Propietario y Comercio"
                    : userType === "propietario"
                      ? "Propietario"
                      : "Comercio"}
                </p>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Fijar menú abierto" : "Colapsar menú"}
              title={sidebarCollapsed ? "Fijar menú abierto" : "Colapsar menú"}
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-nav-ink-soft transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep active:scale-90 lg:flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          </div>

          <div className="mt-2.5 space-y-px">
            <Link href={msPath("/mi-perfil")} onClick={() => handleNavClick(msPath("/mi-perfil"))}>
              <div
                className={`group flex h-9 items-center rounded-lg text-[13px] text-nav-ink transition-colors duration-150 hover:bg-nav-hover hover:text-brand-deep ${
                  collapsed ? "justify-center" : "gap-2.5 px-2.5"
                }`}
              >
                <Settings
                  className="h-[17px] w-[17px] shrink-0 text-nav-ink-soft transition-colors duration-150 group-hover:text-brand"
                  strokeWidth={1.75}
                />
                {!collapsed && <span className="truncate">Mi Perfil</span>}
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className={`group flex h-9 w-full items-center rounded-lg text-[13px] text-nav-ink transition-colors duration-150 hover:bg-danger/6 hover:text-danger ${
                collapsed ? "justify-center" : "gap-2.5 px-2.5"
              }`}
            >
              <LogOut
                className="h-[17px] w-[17px] shrink-0 text-nav-ink-soft transition-colors duration-150 group-hover:text-danger"
                strokeWidth={1.75}
              />
              {!collapsed && <span className="truncate">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`${showHeader ? (sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-[268px]") : ""
          } transition-all duration-[260ms] ease-smooth`}
      >
        {/* Top header */}
        {showHeader && (
          <header className="bg-card border-b border-line sticky top-0 z-30 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden flex items-center justify-center w-10 h-10 text-ink-soft hover:text-ink hover:bg-canvas rounded-xl transition-colors duration-200"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Page title and breadcrumbs */}
                <div className="flex flex-col">
                  {breadcrumbs.length > 0 &&
                    breadcrumbs.some(
                      (crumb) => crumb.label && crumb.label.trim()
                    ) && (
                      <nav className="flex items-center space-x-2 text-sm text-ink-soft mb-1">
                        {breadcrumbs
                          .filter((crumb) => crumb.label && crumb.label.trim())
                          .map((crumb, index) => (
                            <div key={index} className="flex items-center">
                              {index > 0 && (
                                <span className="mx-2 text-ink-soft/40">/</span>
                              )}
                              {crumb.href ? (
                                <Link
                                  href={crumb.href}
                                  className="hover:text-ink transition-colors"
                                >
                                  {crumb.label}
                                </Link>
                              ) : (
                                <span className="text-ink font-medium">
                                  {crumb.label}
                                </span>
                              )}
                            </div>
                          ))}
                      </nav>
                    )}
                  <h2 className="text-2xl font-bold text-primary-dark">{pageTitle}</h2>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className={noPadding ? "" : "p-4 sm:p-6 lg:p-8"}>
          <div className={noPadding ? "" : "mx-auto"}>{children}</div>
        </main>
      </div>

      {/* Collapsed Menu - Megamenu para items con children cuando la sidebar está colapsada */}
      <CollapsedMenu
        isOpen={collapsedMenuOpen}
        onClose={() => setCollapsedMenuOpen(false)}
        item={collapsedMenuItem}
      />

      {showPrivacyModal && (
        <PrivacyNoticeModal notice={privacyNotice} onAccept={handlePrivacyAccept} onCancel={handlePrivacyCancel} />
      )}
    </div>
  );
}

export default MinisitioShell;
