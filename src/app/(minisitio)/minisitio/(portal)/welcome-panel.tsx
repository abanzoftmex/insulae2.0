"use client";

/**
 * Panel de bienvenida del portal (antes `components/WelcomePanel.js` del minisitio).
 *
 * Los comunicados recientes, los números de contacto y la síntesis del aviso de privacidad
 * llegan ya cargados desde page.tsx. El carrusel de comunicados destacados y el enlace a la
 * gaceta que el componente viejo consultaba nunca se pintaban (código muerto): no se portan.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Calendar,
  Clock,
  User,
  Home,
  Star,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  FileText,
  MessageCircle,
  TicketIcon,
  Globe,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Info,
  BookOpen,
  Sparkles,
  createLucideIcon,
  type LucideIcon,
} from "lucide-react";
import { Surface, SurfaceHeader } from "@/components/ui/fluent";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import type { ComunicadoReciente } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import type { CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { useDisplayTimeZone } from "./_lib/client-dates";
import { comunicadoFileUrl } from "./_lib/comunicado-file-url";

// lucide-react 1.x ya no incluye iconos de marcas: mismos trazos que la 0.540 del minisitio.
const Facebook = createLucideIcon("facebook", [
  ["path", { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z", key: "1jg4f8" }],
]);
const Instagram = createLucideIcon("instagram", [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "2e1cvw" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "9exkf1" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "r4j83e" }],
]);
const Twitter = createLucideIcon("twitter", [
  [
    "path",
    {
      d: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
      key: "pff0z6",
    },
  ],
]);
const Linkedin = createLucideIcon("linkedin", [
  ["path", { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z", key: "c2jq9f" }],
  ["rect", { width: "4", height: "12", x: "2", y: "9", key: "mk3on5" }],
  ["circle", { cx: "4", cy: "4", r: "2", key: "bt5ra8" }],
]);
const Youtube = createLucideIcon("youtube", [
  [
    "path",
    {
      d: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17",
      key: "1q2vi4",
    },
  ],
  ["path", { d: "m10 15 5-3-5-3z", key: "1jp15x" }],
]);

// Mapa de iconos disponibles
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Home,
  User,
  Globe,
  Clock,
  Calendar,
  Info,
  AlertCircle,
  CheckCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  FileText,
  ExternalLink,
  Bell,
};

/** Comunicado tal como lo pinta el panel (mismo formato que armaba el componente viejo). */
interface ComunicadoPanel {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string | null;
  fechaVigencia: string | null;
  categoria: string;
  imagen: string | null;
  pdf: string | null;
}

function formatComunicadosRecientes(comunicados: ComunicadoReciente[]): ComunicadoPanel[] {
  return comunicados.map((comunicado) => ({
    id: comunicado.id_notificaciones,
    titulo: comunicado.nombre,
    descripcion: comunicado.descripcion,
    fecha: comunicado.fechaPublicar,
    fechaVigencia: comunicado.fechaVigencia,
    categoria: comunicado.categoria,
    imagen: comunicado.imagen ? comunicadoFileUrl(comunicado.imagen) : null,
    pdf: comunicado.pdf ? comunicadoFileUrl(comunicado.pdf) : null,
  }));
}

export function WelcomePanel({
  comunicadosRecientes: comunicadosRecientesData,
  camposContacto,
  sintesisAviso,
}: {
  comunicadosRecientes: ComunicadoReciente[];
  camposContacto: CampoContacto[];
  sintesisAviso: string;
}) {
  const [selectedNotification, setSelectedNotification] = useState<ComunicadoPanel | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [comunicadosRecientes] = useState(() => formatComunicadosRecientes(comunicadosRecientesData));
  const { user, hasPropiedades, hasComerciosArrendamientos } = useMinisitioAuth();
  const timeZone = useDisplayTimeZone();

  // Formateador seguro de fechas contra RangeError: Invalid time value
  const formatDateSafe = (
    dateStr: string | null,
    options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
  ) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("es-MX", { ...options, timeZone });
    } catch {
      return "";
    }
  };

  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    try {
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone,
      };
      return today.toLocaleDateString("es-ES", options);
    } catch {
      return "";
    }
  };

  // Obtener hora actual
  const getCurrentTime = () => {
    try {
      const now = new Date();
      return now.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      });
    } catch {
      return "";
    }
  };

  // Manejar el bloqueo del scroll cuando se abre el sidepanel
  useEffect(() => {
    if (showSidePanel) {
      // Bloquear scroll
      document.body.style.overflow = "hidden";
    } else {
      // Restaurar scroll
      document.body.style.overflow = "unset";
    }

    // Cleanup function para restaurar el scroll cuando el componente se desmonte
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showSidePanel]);

  // Obtener nombre del usuario
  const getUserName = () => {
    const u = user;
    if (!u) return "Condómino";
    return u.nombre || u.razon_social || (u.email ? u.email.split("@")[0] : "Condómino");
  };

  // Abrir sidepanel con la notificación seleccionada
  const openSidePanel = (notification: ComunicadoPanel) => {
    setSelectedNotification(notification);
    setShowSidePanel(true);
  };

  // Cerrar sidepanel
  const closeSidePanel = () => {
    setShowSidePanel(false);
    setSelectedNotification(null);
  };

  return (
    <div className="min-h-screen">
      {/* ─── Hero / Banner de Bienvenida Cálida (Sin números) ───────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-deep via-brand to-brand-deep p-6 md:p-8 text-white shadow-lg border border-brand/20">
        {/* Marca de agua traslúcida */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/valquirico-logo-light.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-1/2 hidden w-[380px] -translate-y-1/2 opacity-[0.08] md:block"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3.5 py-1 text-[10px] tracking-widest bg-brand-mint text-brand-deep font-bold uppercase shadow-xs">
                Portal del Condómino
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-semibold tracking-wider uppercase border border-white/15">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                Comunidad Insulae
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              ¡Hola, {getUserName()}! Te damos la bienvenida a Val'Quirico
            </h1>

            <p className="text-white/85 text-xs md:text-sm font-medium leading-relaxed">
              {hasPropiedades && hasComerciosArrendamientos
                ? "Tu portal oficial de condómino. Gestiona tus propiedades y locales comerciales, revisa los comunicados oficiales de la administración y accede a la normativa oficial de manera ágil y transparente."
                : hasPropiedades
                  ? "Tu portal oficial de condómino. Gestiona tus residencias e inmuebles, revisa los comunicados oficiales y mantente informado sobre la vida comunitaria en Val'Quirico."
                  : hasComerciosArrendamientos
                    ? "Tu portal oficial de comercios y arrendamientos. Supervisa tus contratos de arrendamiento, comunicados y trámites de atención en Val'Quirico."
                    : "Tu centro de consulta y servicios en Val'Quirico. Revisa avisos oficiales, genera solicitudes de atención y consulta la normativa comunitaria."}
            </p>

            <div className="pt-1 text-[11px] font-bold text-brand-mint/90 uppercase tracking-wider flex items-center gap-2">
              <span>Val'Quirico</span>
              <span>·</span>
              <span suppressHydrationWarning>{getCurrentDate()}</span>
              <span>·</span>
              <span suppressHydrationWarning>{getCurrentTime()}</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
            {hasPropiedades && (
              <Link
                href={msPath("/propiedades")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-mint text-brand-deep font-bold text-xs hover:bg-white transition-standard shadow-sm"
              >
                <Home className="h-4 w-4" />
                Mis Propiedades
              </Link>
            )}
            {hasComerciosArrendamientos && (
              <Link
                href={msPath("/arrendamientos")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#b58c42] text-white font-bold text-xs hover:bg-white hover:text-brand-deep transition-standard shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Mis Comercios
              </Link>
            )}
            <Link
              href={msPath("/comunicados")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-standard border border-white/20"
            >
              <Bell className="h-4 w-4" />
              Avisos y Comunicados
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Accesos Principales de Condómino (Sin números) ───────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold uppercase tracking-wider text-[#5d5b35]">
            Módulos del Condómino
          </h2>
          <span className="text-[11px] font-semibold text-fg-3">
            Accesos directos a tu información
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasPropiedades && (
            <Link href={msPath("/propiedades")} className="block group">
              <div className="p-5 h-full transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] shadow-sm hover:shadow-md hover:border-[#5d5b35]/40">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#5d5b35]/10 border border-[#5d5b35]/15 group-hover:bg-[#5d5b35] group-hover:text-white transition-colors text-[#5d5b35]">
                      <Home className="h-5 w-5" />
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#f4f7f6] text-black/60 border border-black/5">
                      Inmuebles
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-black/85 group-hover:text-[#5d5b35] transition-colors">
                      Mis Propiedades
                    </h3>
                    <p className="text-xs text-black/60 leading-relaxed mt-1">
                      Consulta la información de tus lotes, viviendas y áreas privativas en Val'Quirico.
                    </p>
                  </div>
                </div>
                <div className="pt-4 mt-2 border-t border-black/5 flex items-center text-xs font-bold text-[#5d5b35] group-hover:translate-x-0.5 transition-transform">
                  <span>Ver propiedades</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                </div>
              </div>
            </Link>
          )}

          {hasComerciosArrendamientos && (
            <Link href={msPath("/arrendamientos")} className="block group">
              <div className="p-5 h-full transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] shadow-sm hover:shadow-md hover:border-[#5d5b35]/40">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#5d5b35]/10 border border-[#5d5b35]/15 group-hover:bg-[#5d5b35] group-hover:text-white transition-colors text-[#5d5b35]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#f4f7f6] text-black/60 border border-black/5">
                      Comercial
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-black/85 group-hover:text-[#5d5b35] transition-colors">
                      Mis Comercios
                    </h3>
                    <p className="text-xs text-black/60 leading-relaxed mt-1">
                      Supervisa los locales comerciales y contratos de arrendamiento vigentes.
                    </p>
                  </div>
                </div>
                <div className="pt-4 mt-2 border-t border-black/5 flex items-center text-xs font-bold text-[#5d5b35] group-hover:translate-x-0.5 transition-transform">
                  <span>Ver comercios</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                </div>
              </div>
            </Link>
          )}

          <Link href={msPath("/comunicados")} className="block group">
            <div className="p-5 h-full transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] shadow-sm hover:shadow-md hover:border-[#5d5b35]/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#5d5b35]/10 border border-[#5d5b35]/15 group-hover:bg-[#5d5b35] group-hover:text-white transition-colors text-[#5d5b35]">
                    <Bell className="h-5 w-5" />
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#b58c42]/15 text-[#8d6928] border border-[#b58c42]/30">
                    Oficial
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black/85 group-hover:text-[#5d5b35] transition-colors">
                    Comunicados Oficiales
                  </h3>
                  <p className="text-xs text-black/60 leading-relaxed mt-1">
                    Noticias, avisos importantes y circulares emitidas por la administración.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-black/5 flex items-center text-xs font-bold text-[#5d5b35] group-hover:translate-x-0.5 transition-transform">
                <span>Consultar avisos</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
              </div>
            </div>
          </Link>

          <Link href={msPath("/tickets")} className="block group">
            <div className="p-5 h-full transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] shadow-sm hover:shadow-md hover:border-[#922f12]/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#922f12]/10 border border-[#922f12]/15 group-hover:bg-[#922f12] group-hover:text-white transition-colors text-[#922f12]">
                    <TicketIcon className="h-5 w-5" />
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#922f12]/10 text-[#922f12] border border-[#922f12]/20">
                    Atención
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black/85 group-hover:text-[#922f12] transition-colors">
                    Solicitudes y Reportes
                  </h3>
                  <p className="text-xs text-black/60 leading-relaxed mt-1">
                    Levanta tickets de mantenimiento, dudas o solicitudes con seguimiento directo.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-black/5 flex items-center text-xs font-bold text-[#922f12] group-hover:translate-x-0.5 transition-transform">
                <span>Gestionar tickets</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Segunda fila de accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <Link href={msPath("/reglamentos")} className="block group">
            <div className="p-5 h-full transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] hover:border-[#5d5b35]/30">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#5d5b35] text-white shrink-0 group-hover:bg-[#3d3c22] transition-colors">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-bold text-[#5d5b35] tracking-tight">
                    Reglamentos y Normas
                  </h3>
                </div>
                <p className="text-xs text-black/60 leading-relaxed">
                  Consulta los estatutos condominales, manual de convivencia y actas oficiales.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#5d5b35] text-white text-[10px] font-bold uppercase tracking-tight shadow-xs group-hover:bg-[#3d3c22] transition-colors">
                  <ChevronRight className="h-3 w-3" /> Ver reglamentos
                </span>
              </div>
            </div>
          </Link>

          <Link href={msPath("/experiencias")} className="block group">
            <div className="p-5 h-full transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] hover:border-[#b58c42]/30">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#b58c42] text-white shrink-0 group-hover:bg-[#8d6928] transition-colors">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-bold text-[#8d6928] tracking-tight">
                    Experiencias Val'Quirico
                  </h3>
                </div>
                <p className="text-xs text-black/60 leading-relaxed">
                  Descubre eventos, amenidades, gastronomía y actividades exclusivas.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#b58c42] text-white text-[10px] font-bold uppercase tracking-tight shadow-xs group-hover:bg-[#8d6928] transition-colors">
                  <ChevronRight className="h-3 w-3" /> Ver experiencias
                </span>
              </div>
            </div>
          </Link>

          <Link href={msPath("/campos-contacto")} className="block group">
            <div className="p-5 h-full transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] hover:border-[#922f12]/30">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#922f12] text-white shrink-0 group-hover:bg-[#78230b] transition-colors">
                    <Phone className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-bold text-[#922f12] tracking-tight">
                    Teléfonos y Emergencia
                  </h3>
                </div>
                <p className="text-xs text-black/60 leading-relaxed">
                  Directorio de seguridad, administración, guardia y atención 24/7.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#922f12] text-white text-[10px] font-bold uppercase tracking-tight shadow-xs group-hover:bg-[#78230b] transition-colors">
                  <ChevronRight className="h-3 w-3" /> Ver teléfonos
                </span>
              </div>
            </div>
          </Link>

          <a href="https://www.mapavalquirico.com/" target="_blank" rel="noopener noreferrer" className="block group">
            <div className="p-5 h-full transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between rounded-2xl bg-white border border-black/[0.08] hover:border-[#5d5b35]/30">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#5d5b35] text-white shrink-0 group-hover:bg-[#3d3c22] transition-colors">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-bold text-[#5d5b35] tracking-tight">
                    Mapa de Val'Quirico
                  </h3>
                </div>
                <p className="text-xs text-black/60 leading-relaxed">
                  Explorador de calles, zonas residenciales y puntos de interés.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#5d5b35] text-white text-[10px] font-bold uppercase tracking-tight shadow-xs group-hover:bg-[#3d3c22] transition-colors">
                  <ChevronRight className="h-3 w-3" /> Abrir mapa
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* ─── Últimos Comunicados del Condominio ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/[0.08] overflow-hidden">
        <div className="bg-gradient-to-r from-brand-deep/10 via-brand/10 to-brand-deep/10 px-6 py-4 border-b border-brand/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-xs">
                <Bell className="w-5 h-5 text-brand-mint" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-deep">
                  Últimos Comunicados
                </h3>
                <p className="text-brand text-xs font-medium">
                  Actualizaciones y avisos oficiales para condóminos
                </p>
              </div>
            </div>
            <Link
              href={msPath("/comunicados")}
              className="text-xs font-bold text-brand hover:text-brand-deep flex items-center gap-1 transition-colors"
            >
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {comunicadosRecientes.length === 0 ? (
          <div className="text-center py-10 px-6">
            <div className="w-12 h-12 bg-black/[0.04] rounded-xl flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-black/30" />
            </div>
            <h3 className="text-sm font-bold text-black/80 mb-1">
              No hay comunicados recientes por el momento
            </h3>
            <p className="text-xs text-black/50 max-w-sm mx-auto">
              Te notificaremos aquí cuando la administración publique nuevos avisos.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {comunicadosRecientes.map((comunicado) => (
                <div
                  key={comunicado.id}
                  className="group relative overflow-hidden rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer bg-white border border-black/[0.08] hover:border-brand/30 flex flex-col"
                  onClick={() => openSidePanel(comunicado)}
                >
                  {comunicado.imagen && (
                    <div className="w-full h-48 bg-[#f4f7f6] flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comunicado.imagen}
                        alt={comunicado.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-mint text-brand-deep">
                          {comunicado.categoria || "General"}
                        </span>
                        <span className="text-[11px] text-black/40 font-medium" suppressHydrationWarning>
                          {formatDateSafe(comunicado.fecha, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) || "Fecha no especificada"}
                        </span>
                      </div>

                      <h4 className="font-bold mb-1.5 text-base text-black/85 group-hover:text-brand transition-colors line-clamp-2">
                        {comunicado.titulo}
                      </h4>
                      <p className="text-xs text-black/60 line-clamp-2 mb-4 leading-relaxed">
                        {comunicado.descripcion}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-black/5 flex items-center text-xs font-bold text-brand group-hover:translate-x-0.5 transition-transform">
                      <span>Leer comunicado completo</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Contact Information ────────────────────────────────────────── */}
      <Surface className="overflow-hidden">
        <SurfaceHeader
          title="¿Necesitas ayuda?"
          subtitle="Atención de 9:30 a 18:00, de lunes a viernes"
        />
        <div className="p-4">
          {camposContacto.length === 0 ? (
            <div className="text-center py-8">
              <Info className="w-8 h-8 text-fg-4 mx-auto mb-3" />
              <p className="text-[13px] text-fg-3">No hay campos de contacto disponibles</p>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-6 ${
                camposContacto.length === 1
                  ? "md:grid-cols-1 max-w-md mx-auto"
                  : camposContacto.length === 2
                    ? "md:grid-cols-2"
                    : camposContacto.length === 3
                      ? "md:grid-cols-3"
                      : "md:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {camposContacto.map((campo) => {
                const IconComponent = ICON_MAP[campo.icono] || Phone;
                return (
                  <div
                    key={campo.id}
                    className="flex items-start gap-3 rounded-panel border border-stroke-3 p-3"
                  >
                    <IconComponent className="mt-0.5 h-4 w-4 shrink-0 text-fg-3" />
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-semibold leading-5 text-fg">
                        {campo.titulo}
                      </h4>
                      {campo.enlace ? (
                        <a
                          href={campo.enlace}
                          target={campo.target || "_self"}
                          rel={campo.target === "_blank" ? "noopener noreferrer" : undefined}
                          className="text-[12px] leading-4 text-fg-3 break-words transition-colors hover:text-brand"
                        >
                          {campo.contenido}
                        </a>
                      ) : (
                        <p className="text-[12px] leading-4 text-fg-3 break-words">
                          {campo.contenido}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Surface>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <div className="text-center py-6 space-y-3">
        <p className="text-[12px] text-fg-3">
          Insulae 2.0 · Minisitio Condóminos · Val'Quirico
        </p>

        {sintesisAviso ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto text-left">
            <div className="flex items-start space-x-3">
              <Info className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 mb-2">Aviso de Privacidad</h3>
                <div
                  className="text-xs text-gray-700 leading-relaxed mb-3 whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: sintesisAviso }}
                />
                <Link
                  href={msPath("/aviso-privacidad")}
                  className="inline-flex items-center space-x-1.5 text-blue-600 hover:text-blue-800 text-xs font-semibold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Leer Aviso de Privacidad completo</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Link
              href={msPath("/aviso-privacidad")}
              className="inline-flex items-center space-x-2 text-gray-500 hover:text-brand transition-colors text-xs font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Aviso de Privacidad</span>
            </Link>
          </div>
        )}
      </div>

      {/* ─── SidePanel Modal ─────────────────────────────────────────────── */}
      {showSidePanel && selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={closeSidePanel}
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-brand-deep to-brand text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedNotification.titulo}
                    </h2>
                    <p className="text-white/80 text-xs">
                      {selectedNotification.categoria || "Comunicado"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeSidePanel}
                  aria-label="Cerrar panel"
                  className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedNotification.imagen && (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedNotification.imagen}
                      alt={selectedNotification.titulo}
                      className="w-full max-h-96 object-contain"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900">Descripción</h3>
                  <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                    {selectedNotification.descripcion}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold text-gray-700">Fecha</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      {formatDateSafe(selectedNotification.fecha, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }) || "Fecha no especificada"}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center space-x-2 mb-1">
                      <Star className="w-4 h-4 text-brand" />
                      <span className="text-xs font-bold text-gray-700">Categoría</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      {selectedNotification.categoria || "General"}
                    </p>
                  </div>
                </div>

                {selectedNotification.pdf && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Documento Adjunto</h4>
                        <p className="text-xs text-gray-600">Ver documento oficial en PDF</p>
                      </div>
                    </div>
                    <a
                      href={selectedNotification.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      Abrir PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
