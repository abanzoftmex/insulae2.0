/**
 * Navegación del portal: una sola fuente para la barra lateral, el buscador global y los
 * títulos del encabezado. Los nombres, los módulos y los permisos son los aprobados
 * (f7953bc); una pantalla nueva se registra aquí y aparece en los tres lugares.
 */
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  FileText,
  Handshake,
  Home,
  Landmark,
  MailPlus,
  Map,
  Megaphone,
  Phone,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import type { MinisitioUserType } from "@/modules/minisitio/domain/types";
import { msPath } from "./paths";

export interface NavEntry {
  name: string;
  href?: string;
  icon: LucideIcon;
  current: boolean;
  show?: boolean;
  external?: boolean;
  badge?: string | number;
  /** Palabras extra con las que el buscador global encuentra la pantalla. */
  keywords?: string;
  children?: NavEntry[];
}

/** Color de cada módulo del rail: los de la ilustración de Val'Quirico (valquirico-art.tsx). */
export type NavTone = "olivo" | "teja" | "ocre" | "verde" | "vino";

export interface NavSection {
  title: string;
  tone: NavTone;
  items: NavEntry[];
}

/** Título por defecto de cada pantalla (ruta sin el prefijo /minisitio). */
const ROUTE_TITLES: [RegExp, string][] = [
  [/^\/$/, "Bienvenida"],
  [/^\/dashboard$/, "Panel de Control"],
  [/^\/propiedades$/, "Mis Propiedades"],
  [/^\/propiedades\/[^/]+\/estado-cuenta$/, "Estado de Cuenta"],
  [/^\/propiedades\/[^/]+$/, "Propiedad"],
  [/^\/arrendamientos$/, "Mis Comercios"],
  [/^\/arrendamientos\/[^/]+\/estado-cuenta$/, "Estado de Cuenta"],
  [/^\/arrendamientos\/[^/]+$/, "Detalle de Comercio"],
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

export function resolveRouteTitle(path: string): string {
  return ROUTE_TITLES.find(([re]) => re.test(path))?.[1] ?? "Dashboard";
}

/** Módulos del rail, por nombre de ítem. Lo que no aparezca aquí cae en "Más": así una
 *  entrada nueva nunca desaparece en silencio. */
const NAV_GROUPS: { title: string; tone: NavTone; items: string[] }[] = [
  { title: "Inicio", tone: "olivo", items: ["Bienvenida", "Panel de Control"] },
  // Teja de los techos para las casas y locales; ocre para el dinero; verde como el WhatsApp
  // de la ayuda; vino del logotipo para lo del pueblo.
  { title: "Mi patrimonio", tone: "teja", items: ["Mis Propiedades", "Mis Comercios"] },
  { title: "Financiero", tone: "ocre", items: ["Reportes Condominales"] },
  { title: "Atención", tone: "verde", items: ["Comunicados", "Solicitudes y reportes"] },
  {
    title: "Val'Quirico",
    tone: "vino",
    items: ["Documentos Condominales", "Aviso de privacidad", "Experiencias Val'Quirico", "Números de Emergencia", "Mostrar el Mapa"],
  },
];

export function buildNavSections({
  currentPath,
  userType,
  hasPropiedades,
  hasComercios,
}: {
  /** Ruta sin el prefijo /minisitio. */
  currentPath: string;
  userType: MinisitioUserType | null;
  hasPropiedades: boolean;
  hasComercios: boolean;
}): NavSection[] {
  const esPropietario = userType === "propietario" || userType === "both";
  const esArrendatario = userType === "arrendatario" || userType === "both";

  const navigation = (
    [
      { name: "Bienvenida", href: msPath("/"), icon: Handshake, current: currentPath === "/", keywords: "inicio portada" },
      {
        name: "Panel de Control",
        href: msPath("/dashboard"),
        icon: Settings2,
        current: currentPath === "/dashboard",
        keywords: "dashboard saldo adeudo pagos resumen",
      },
      {
        name: "Mis Propiedades",
        href: msPath("/propiedades"),
        icon: Home,
        current: currentPath === "/propiedades" || currentPath.startsWith("/propiedades/"),
        show: esPropietario && hasPropiedades,
        keywords: "propiedades áreas privativas lotes viviendas estado de cuenta",
      },
      {
        name: "Mis Comercios",
        href: msPath("/arrendamientos"),
        icon: Landmark,
        current: currentPath === "/arrendamientos" || currentPath.startsWith("/arrendamientos/"),
        show: esArrendatario && hasComercios,
        keywords: "comercios locales arrendamientos rentas estado de cuenta",
      },
      {
        name: "Reportes Condominales",
        icon: BarChart3,
        current: currentPath.startsWith("/reporte") || currentPath === "/resumen-financiero",
        show: esPropietario,
        children: [
          {
            name: "Resumen Financiero",
            href: msPath("/resumen-financiero"),
            icon: DollarSign,
            current: currentPath === "/resumen-financiero",
            keywords: "ingresos egresos finanzas balance",
          },
          {
            name: "Reporte de Cuotas Ordinarias",
            href: msPath("/reporte-cuotas"),
            icon: FileText,
            current: currentPath === "/reporte-cuotas",
            keywords: "cuotas ordinarias cartera morosidad adeudos",
          },
          {
            name: "Reporte de Cuotas Extraordinarias",
            href: msPath("/reporte-cuotas-extraordinaria"),
            icon: FileText,
            current: currentPath === "/reporte-cuotas-extraordinaria",
            keywords: "cuotas extraordinarias cartera adeudos",
          },
        ],
      },
      {
        name: "Comunicados",
        href: msPath("/comunicados"),
        icon: Megaphone,
        current: currentPath === "/comunicados",
        keywords: "avisos circulares noticias notificaciones",
      },
      {
        name: "Solicitudes y reportes",
        href: msPath("/tickets"),
        icon: MailPlus,
        current: currentPath === "/tickets",
        keywords: "tickets mantenimiento ayuda quejas",
      },
      {
        name: "Aviso de privacidad",
        href: msPath("/aviso-privacidad"),
        icon: Shield,
        current: currentPath === "/aviso-privacidad",
        keywords: "datos personales",
      },
      {
        name: "Documentos Condominales",
        href: msPath("/reglamentos"),
        icon: BookOpen,
        current: currentPath === "/reglamentos",
        keywords: "reglamentos estatutos normas actas manual convivencia",
      },
      {
        name: "Experiencias Val'Quirico",
        href: msPath("/experiencias"),
        icon: Sparkles,
        current: currentPath === "/experiencias",
        keywords: "eventos gastronomía actividades amenidades",
      },
      {
        name: "Números de Emergencia",
        href: msPath("/campos-contacto"),
        icon: Phone,
        current: currentPath === "/campos-contacto",
        keywords: "teléfonos contacto seguridad guardia administración llamar",
      },
      {
        name: "Mostrar el Mapa",
        href: "https://www.mapavalquirico.com/",
        icon: Map,
        current: false,
        external: true,
        keywords: "mapa calles ubicación zonas",
      },
    ] as NavEntry[]
  ).filter((item) => item.show !== false);

  const agrupados = new Set(NAV_GROUPS.flatMap((g) => g.items));
  return [
    ...NAV_GROUPS.map((g) => ({
      title: g.title,
      tone: g.tone,
      items: g.items.map((n) => navigation.find((i) => i.name === n)).filter((i): i is NavEntry => Boolean(i)),
    })),
    { title: "Más", tone: "olivo" as const, items: navigation.filter((i) => !agrupados.has(i.name)) },
  ].filter((g) => g.items.length > 0);
}
