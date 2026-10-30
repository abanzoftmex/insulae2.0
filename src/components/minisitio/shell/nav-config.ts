/**
 * Arquitectura de información del portal, al estilo de la barra lateral de Slack: tres accesos
 * fijos arriba y secciones que se pliegan. Una sola fuente para la barra lateral, el buscador
 * (⌘K) y la barra inferior del celular. Etiquetas: un concepto, un nombre en todo el portal.
 */
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  ChartColumn,
  CircleUser,
  FileText,
  Home,
  LifeBuoy,
  Map,
  Megaphone,
  MessageSquareText,
  Phone,
  ReceiptText,
  Scale,
  Shield,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import type { MinisitioUserType } from "@/modules/minisitio/domain/types";
import type { SidebarData } from "@/modules/minisitio/infrastructure/queries/sidebar.queries";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  /** Segunda parte de la etiqueta, atenuada: distingue dos unidades homónimas. */
  detail?: string;
  /** Hay algo nuevo sin ver: negrita y tinta plena, como un canal no leído en Slack. */
  unread?: boolean;
  /** Conteo de pendientes (badge crema). */
  count?: number;
  /** Punto de atención para un estado que dura (p. ej. saldo vencido); no pone negrita. */
  attention?: boolean;
  /** Texto para lectores de pantalla cuando hay punto o conteo. */
  attentionLabel?: string;
  /** Rutas (sin /minisitio) que también marcan el ítem como activo. */
  matches?: RegExp;
  /** Palabras extra para el buscador. */
  keywords?: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  /** Resumen para la sección plegada (p. ej. "2 con adeudo"). */
  collapsedHint?: string;
}

export interface NavModel {
  pinned: NavItem[];
  sections: NavSection[];
}

interface NavContext {
  userType: MinisitioUserType | null;
  hasPropiedades: boolean;
  hasComercios: boolean;
  sidebar: SidebarData;
  /** Hay un aviso más nuevo que el último que vio el condómino en este dispositivo. */
  avisosNoLeidos?: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildNavModel({ userType, hasPropiedades, hasComercios, sidebar, avisosNoLeidos = false }: NavContext): NavModel {
  const esPropietario = userType === "propietario" || userType === "both";
  const esArrendatario = userType === "arrendatario" || userType === "both";
  const conAdeudo = sidebar.propiedadesConAdeudo + sidebar.comerciosConAdeudo;

  const pinned: NavItem[] = [
    { id: "inicio", label: "Inicio", href: "/", icon: Home, matches: /^\/$/ },
    {
      id: "avisos",
      label: "Avisos",
      href: "/comunicados",
      icon: Megaphone,
      matches: /^\/(comunicados|notificaciones)/,
      unread: avisosNoLeidos,
      attentionLabel: avisosNoLeidos ? "hay avisos nuevos" : undefined,
      keywords: "comunicados notificaciones circulares noticias",
    },
    {
      id: "solicitudes",
      label: "Solicitudes",
      href: "/tickets",
      icon: MessageSquareText,
      matches: /^\/tickets/,
      count: sidebar.solicitudesAbiertas || undefined,
      attentionLabel: sidebar.solicitudesAbiertas ? plural(sidebar.solicitudesAbiertas, "solicitud abierta", "solicitudes abiertas") : undefined,
      keywords: "tickets reportes mantenimiento ayuda",
    },
  ];

  const sections: NavSection[] = [];

  if (hasPropiedades || hasComercios) {
    sections.push({
      id: "finanzas",
      label: "Finanzas",
      icon: Wallet,
      items: [
        {
          id: "saldos",
          label: "Mis saldos",
          href: "/dashboard",
          icon: Wallet,
          matches: /^\/dashboard/,
          attention: conAdeudo > 0,
          attentionLabel: conAdeudo > 0 ? plural(conAdeudo, "unidad con saldo vencido", "unidades con saldo vencido") : undefined,
          keywords: "saldo adeudo deuda pagos panel resumen cuenta",
        },
      ],
    });
  }

  if (esPropietario && hasPropiedades) {
    sections.push({
      id: "propiedades",
      label: "Mis propiedades",
      icon: Building2,
      collapsedHint: sidebar.propiedadesConAdeudo ? plural(sidebar.propiedadesConAdeudo, "con adeudo", "con adeudo") : undefined,
      items: [
        ...sidebar.propiedades.map((u) => ({
          id: `propiedad-${u.id}`,
          label: u.nombre,
          detail: u.detalle,
          href: `/propiedades/${u.id}`,
          icon: Home,
          matches: new RegExp(`^/propiedades/${escapeRegExp(u.id)}(/|$)`),
          attention: u.vencido,
          attentionLabel: u.vencido ? "Con saldo vencido" : undefined,
          keywords: "propiedad área privativa estado de cuenta",
        })),
        {
          id: "propiedades-todas",
          label: sidebar.totalPropiedades > sidebar.propiedades.length ? `Ver todas (${sidebar.totalPropiedades})` : "Ver todas",
          href: "/propiedades",
          icon: FileText,
          matches: /^\/propiedades$/,
          keywords: "propiedades áreas privativas lista",
        },
      ],
    });
  }

  if (esArrendatario && hasComercios) {
    sections.push({
      id: "comercios",
      label: "Mis comercios",
      icon: Store,
      collapsedHint: sidebar.comerciosConAdeudo ? plural(sidebar.comerciosConAdeudo, "con adeudo", "con adeudo") : undefined,
      items: [
        ...sidebar.comercios.map((u) => ({
          id: `comercio-${u.id}`,
          label: u.nombre,
          detail: u.detalle,
          href: `/arrendamientos/${u.id}`,
          icon: Store,
          matches: new RegExp(`^/arrendamientos/${escapeRegExp(u.id)}(/|$)`),
          attention: u.vencido,
          attentionLabel: u.vencido ? "Con saldo vencido" : undefined,
          keywords: "comercio local arrendamiento estado de cuenta",
        })),
        {
          id: "comercios-todos",
          label: sidebar.totalComercios > sidebar.comercios.length ? `Ver todos (${sidebar.totalComercios})` : "Ver todos",
          href: "/arrendamientos",
          icon: FileText,
          matches: /^\/arrendamientos$/,
          keywords: "comercios arrendamientos locales lista",
        },
      ],
    });
  }

  if (esPropietario) {
    sections.push({
      id: "reportes",
      label: "Reportes del condominio",
      icon: ChartColumn,
      items: [
        { id: "resumen-financiero", label: "Resumen financiero", href: "/resumen-financiero", icon: ChartColumn, matches: /^\/resumen-financiero/, keywords: "ingresos egresos finanzas" },
        { id: "estado-resultado", label: "Estado de resultados", href: "/estado-resultado", icon: Scale, matches: /^\/estado-resultado/, keywords: "ingresos egresos balance" },
        { id: "cuotas", label: "Cartera de cuotas", href: "/reporte-cuotas", icon: ReceiptText, matches: /^\/reporte-cuotas$/, keywords: "cuotas ordinarias cartera morosidad" },
        {
          id: "cuotas-extraordinarias",
          label: "Cuotas extraordinarias",
          href: "/reporte-cuotas-extraordinaria",
          icon: ReceiptText,
          matches: /^\/reporte-cuotas-extraordinaria/,
          keywords: "cuotas extraordinarias cartera",
        },
      ],
    });
  }

  sections.push(
    {
      id: "comunidad",
      label: "Comunidad",
      icon: Sparkles,
      items: [
        { id: "experiencias", label: "Experiencias", href: "/experiencias", icon: Sparkles, matches: /^\/experiencias/, keywords: "eventos gastronomía actividades" },
        { id: "documentos", label: "Documentos del condominio", href: "/reglamentos", icon: BookOpen, matches: /^\/reglamentos/, keywords: "reglamentos estatutos normas actas" },
        { id: "mapa", label: "Mapa de Val'Quirico", href: "https://www.mapavalquirico.com/", icon: Map, external: true, keywords: "calles ubicación" },
      ],
    },
    {
      id: "ayuda",
      label: "Ayuda",
      icon: LifeBuoy,
      items: [
        { id: "emergencias", label: "Teléfonos de emergencia", href: "/campos-contacto", icon: Phone, matches: /^\/campos-contacto/, keywords: "contacto seguridad guardia administración llamar" },
        { id: "privacidad", label: "Aviso de privacidad", href: "/aviso-privacidad", icon: Shield, matches: /^\/aviso-privacidad/, keywords: "datos personales" },
      ],
    },
  );

  return { pinned, sections };
}

/** Menú de cuenta (avatar). */
export const ACCOUNT_ITEMS: NavItem[] = [
  { id: "perfil", label: "Mi perfil", href: "/mi-perfil", icon: CircleUser, matches: /^\/mi-perfil/, keywords: "datos fiscales factura constancia" },
];

/** Título de la pantalla por ruta (sin /minisitio). Las páginas con datos lo sobrescriben. */
export const ROUTE_TITLES: [RegExp, string][] = [
  [/^\/$/, "Inicio"],
  [/^\/dashboard$/, "Mis saldos"],
  [/^\/propiedades$/, "Mis propiedades"],
  [/^\/propiedades\/[^/]+\/estado-cuenta$/, "Estado de cuenta"],
  [/^\/propiedades\/[^/]+$/, "Propiedad"],
  [/^\/arrendamientos$/, "Mis comercios"],
  [/^\/arrendamientos\/[^/]+\/estado-cuenta$/, "Estado de cuenta"],
  [/^\/arrendamientos\/[^/]+$/, "Comercio"],
  [/^\/comunicados$/, "Avisos"],
  [/^\/notificaciones$/, "Historial de avisos"],
  [/^\/experiencias$/, "Experiencias"],
  [/^\/tickets$/, "Solicitudes"],
  [/^\/mi-perfil$/, "Mi perfil"],
  [/^\/reglamentos$/, "Documentos del condominio"],
  [/^\/campos-contacto$/, "Teléfonos de emergencia"],
  [/^\/aviso-privacidad$/, "Aviso de privacidad"],
  [/^\/estado-resultado$/, "Estado de resultados"],
  [/^\/resumen-financiero$/, "Resumen financiero"],
  [/^\/reporte-cuotas$/, "Cartera de cuotas"],
  [/^\/reporte-cuotas-extraordinaria$/, "Cuotas extraordinarias"],
  [/^\/reporte-general$/, "Reporte general"],
];

export function resolveRouteTitle(path: string): string {
  return ROUTE_TITLES.find(([re]) => re.test(path))?.[1] ?? "Portal del condómino";
}

export function isItemActive(item: NavItem, path: string): boolean {
  if (item.external) return false;
  return item.matches ? item.matches.test(path) : path === item.href;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
