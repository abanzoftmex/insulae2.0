"use client";

/**
 * Panel de bienvenida del portal (antes `components/WelcomePanel.js` del minisitio).
 *
 * Los comunicados recientes, los números de contacto y la síntesis del aviso de privacidad
 * llegan ya cargados desde page.tsx. El carrusel de comunicados destacados y el enlace a la
 * gaceta que el componente viejo consultaba nunca se pintaban (código muerto): no se portan.
 */
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Home,
  Landmark,
  MailPlus,
  MapPin,
  Megaphone,
  Phone,
  Shield,
  Star,
  BookOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useMinisitioAuth } from "@/components/minisitio/use-minisitio-auth";
import { msPath } from "@/components/minisitio/paths";
import { SidePanel } from "@/components/minisitio/ui/side-panel";
import { categoriaComunicado } from "@/components/minisitio/comunicado-categoria";
import type { ComunicadoReciente } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import type { CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { useDisplayTimeZone } from "./_lib/client-dates";
import { comunicadoFileUrl } from "./_lib/comunicado-file-url";
import { AyudaContacto } from "./_bienvenida/ayuda-contacto";
import { UltimosComunicados, type ComunicadoPanel } from "./_bienvenida/ultimos-comunicados";

function formatComunicadosRecientes(comunicados: ComunicadoReciente[]): ComunicadoPanel[] {
  return comunicados.map((comunicado) => ({
    id: comunicado.id_notificaciones,
    titulo: comunicado.nombre,
    descripcion: comunicado.descripcion,
    fecha: comunicado.fechaPublicar,
    fechaVigencia: comunicado.fechaVigencia,
    categoria: categoriaComunicado(comunicado.categoria),
    imagen: comunicado.imagen ? comunicadoFileUrl(comunicado.imagen) : null,
    pdf: comunicado.pdf ? comunicadoFileUrl(comunicado.pdf) : null,
  }));
}

type Tono = "brand" | "gold" | "terracotta";

/** Colores por tono, todos con contraste AA para texto blanco sobre el color (el dorado de marca
 *  #b58c42 no llega: se usa su versión accesible, `warning`). */
const TONO: Record<Tono, { solid: string; soft: string; text: string; tag: string; hoverBorder: string }> = {
  brand: {
    solid: "bg-brand group-hover:bg-brand-deep",
    soft: "bg-brand/[0.08] text-brand ring-brand/10 group-hover:bg-brand group-hover:text-white",
    text: "text-brand group-hover:text-brand-deep",
    tag: "bg-surface-4 text-fg-3",
    hoverBorder: "hover:border-brand/30",
  },
  gold: {
    solid: "bg-warning group-hover:bg-[#755720]",
    soft: "bg-brand-accent/[0.1] text-warning ring-brand-accent/20 group-hover:bg-warning group-hover:text-white",
    text: "text-warning group-hover:text-[#755720]",
    tag: "bg-gold-soft text-warning ring-1 ring-inset ring-brand-accent/25",
    hoverBorder: "hover:border-brand-accent/40",
  },
  terracotta: {
    solid: "bg-terracotta group-hover:bg-[#78230b]",
    soft: "bg-terracotta/[0.08] text-terracotta ring-terracotta/10 group-hover:bg-terracotta group-hover:text-white",
    text: "text-terracotta group-hover:text-[#78230b]",
    tag: "bg-terracotta/[0.07] text-terracotta ring-1 ring-inset ring-terracotta/15",
    hoverBorder: "hover:border-terracotta/30",
  },
};

const CARD =
  "group flex h-full flex-col rounded-2xl border border-stroke-2 bg-card p-5 outline-none transition-[border-color,box-shadow,translate] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgb(61_60_34/0.28)] focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:hover:translate-y-0";

/** Tarjeta de "Módulos del condómino". */
function ModuleCard({
  href,
  icon: Icon,
  tag,
  title,
  description,
  cta,
  tono = "brand",
  tagTono = "brand",
}: {
  href: string;
  icon: LucideIcon;
  tag: string;
  title: string;
  description: string;
  cta: string;
  tono?: Tono;
  tagTono?: Tono;
}) {
  const t = TONO[tono];
  return (
    <Link href={href} className={`${CARD} ${t.hoverBorder}`}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset transition-colors duration-200 ${t.soft}`}
        >
          <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-4 ${TONO[tagTono].tag}`}>{tag}</span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold leading-5 text-fg">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-5 text-fg-3">{description}</p>
      <span aria-hidden className="min-h-5 flex-1" />
      <span className={`flex items-center gap-1.5 border-t border-stroke-3 pt-4 text-[13px] font-semibold transition-colors duration-150 ${t.text}`}>
        {cta}
        <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={2.25} />
      </span>
    </Link>
  );
}

/** Tarjeta de la segunda fila (accesos rápidos). */
function QuickCard({
  href,
  icon: Icon,
  title,
  description,
  cta,
  tono = "brand",
  external = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  tono?: Tono;
  external?: boolean;
}) {
  const t = TONO[tono];
  const Arrow = external ? ArrowUpRight : ArrowRight;
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-colors duration-200 ${t.solid}`}>
          <Icon aria-hidden className="h-4 w-4" strokeWidth={2} />
        </span>
        <h3 className="text-[14px] font-semibold leading-5 text-fg">{title}</h3>
      </div>
      <p className="mt-3 text-[13.5px] leading-5 text-fg-3">{description}</p>
      <span aria-hidden className="min-h-5 flex-1" />
      <span
        className={`inline-flex h-8 w-fit items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-white transition-colors duration-200 ${t.solid}`}
      >
        {cta}
        <Arrow
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${external ? "group-hover:-translate-y-px group-hover:translate-x-px" : "group-hover:translate-x-0.5"}`}
          strokeWidth={2.25}
        />
      </span>
    </>
  );
  const className = `${CARD} ${t.hoverBorder}`;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

function SectionHeading({ id, title, subtitle, action }: { id: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id={id} className="text-[18px] font-bold leading-6 tracking-[-0.01em] text-fg">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[13px] leading-5 text-fg-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
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
  // El comunicado abierto se conserva mientras el panel sale, para que no se vacíe a medio cierre.
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

  // Obtener nombre del usuario
  const getUserName = () => {
    const u = user;
    if (!u) return "Condómino";
    return u.nombre || u.razon_social || (u.email ? u.email.split("@")[0] : "Condómino");
  };

  const openSidePanel = (notification: ComunicadoPanel) => {
    setSelectedNotification(notification);
    setShowSidePanel(true);
  };

  const closeSidePanel = () => setShowSidePanel(false);

  const descripcion =
    hasPropiedades && hasComerciosArrendamientos
      ? "Tu portal oficial de condómino. Gestiona tus propiedades y locales comerciales, revisa los comunicados oficiales de la administración y accede a la normativa oficial de manera ágil y transparente."
      : hasPropiedades
        ? "Tu portal oficial de condómino. Gestiona tus residencias e inmuebles, revisa los comunicados oficiales y mantente informado sobre la vida comunitaria en Val'Quirico."
        : hasComerciosArrendamientos
          ? "Tu portal oficial de comercios y arrendamientos. Supervisa tus contratos de arrendamiento, comunicados y trámites de atención en Val'Quirico."
          : "Tu centro de consulta y servicios en Val'Quirico. Revisa avisos oficiales, genera solicitudes de atención y consulta la normativa comunitaria.";

  const seleccionado = selectedNotification;
  const fechaSeleccionado = seleccionado ? formatDateSafe(seleccionado.fecha, { year: "numeric", month: "long", day: "numeric" }) : "";
  const vigenciaSeleccionado = seleccionado ? formatDateSafe(seleccionado.fechaVigencia, { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <div className="space-y-10">
      {/* ─── Banner de bienvenida ─────────────────────────────────────────── */}
      <section
        aria-labelledby="bienvenida-saludo"
        className="relative isolate overflow-hidden rounded-2xl bg-brand-deep px-6 py-8 text-white shadow-[0_1px_2px_rgb(61_60_34/0.25),0_16px_40px_-20px_rgb(61_60_34/0.6)] md:px-10 md:py-10"
      >
        {/* Una luz cálida desde la esquina da profundidad; no es un degradado de borde a borde. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(110%_120%_at_0%_0%,rgb(117_114_66/0.75),transparent_55%),radial-gradient(80%_100%_at_100%_100%,rgb(45_44_24/0.9),transparent_60%)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/valquirico-logo-light.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-8 top-1/2 -z-10 hidden w-[360px] -translate-y-1/2 opacity-[0.07] lg:block"
        />

        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-full bg-brand-mint px-2.5 text-[12px] font-semibold text-brand-deep">
                Portal del condómino
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 text-[12px] font-medium text-white/90">
                <CheckCircle aria-hidden className="h-3.5 w-3.5 text-brand-mint" strokeWidth={2.25} />
                Comunidad Insulae
              </span>
            </div>

            <h2
              id="bienvenida-saludo"
              className="mt-4 text-balance text-[28px] font-bold leading-[1.15] tracking-[-0.022em] text-white md:text-[34px]"
            >
              ¡Hola, {getUserName()}! Te damos la bienvenida a Val&apos;Quirico
            </h2>

            <p className="mt-3 max-w-[64ch] text-pretty text-[15px] leading-6 text-white/80">{descripcion}</p>

            <p className="mt-5 flex flex-wrap items-center gap-x-2 text-[13px] font-medium text-brand-mint/85">
              <span>Val&apos;Quirico</span>
              <span aria-hidden className="text-brand-mint/40">
                ·
              </span>
              <span suppressHydrationWarning className="first-letter:uppercase">
                {getCurrentDate()}
              </span>
              <span aria-hidden className="text-brand-mint/40">
                ·
              </span>
              <span suppressHydrationWarning className="tabular-nums">
                {getCurrentTime()}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row md:w-56 md:flex-col">
            {hasPropiedades && (
              <Link
                href={msPath("/propiedades")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-mint px-4 text-[14px] font-semibold text-brand-deep shadow-[0_1px_2px_rgb(0_0_0/0.15)] outline-none transition-[background-color,translate] duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep active:translate-y-px"
              >
                <Home aria-hidden className="h-4 w-4" strokeWidth={2} />
                Mis Propiedades
              </Link>
            )}
            {hasComerciosArrendamientos && (
              <Link
                href={msPath("/arrendamientos")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-warning px-4 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(0_0_0/0.15)] outline-none transition-[background-color,color,translate] duration-150 hover:bg-white hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep active:translate-y-px"
              >
                <Landmark aria-hidden className="h-4 w-4" strokeWidth={2} />
                Mis Comercios
              </Link>
            )}
            <Link
              href={msPath("/comunicados")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-4 text-[14px] font-semibold text-white outline-none transition-[background-color,border-color,translate] duration-150 hover:border-white/30 hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep active:translate-y-px"
            >
              <Megaphone aria-hidden className="h-4 w-4" strokeWidth={2} />
              Avisos y Comunicados
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Módulos del condómino ─────────────────────────────────────────── */}
      <section aria-labelledby="bienvenida-modulos" className="space-y-4">
        <SectionHeading id="bienvenida-modulos" title="Módulos del condómino" subtitle="Accesos directos a tu información" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {hasPropiedades && (
            <ModuleCard
              href={msPath("/propiedades")}
              icon={Home}
              tag="Inmuebles"
              title="Mis Propiedades"
              description="Consulta la información de tus lotes, viviendas y áreas privativas en Val'Quirico."
              cta="Ver propiedades"
            />
          )}
          {hasComerciosArrendamientos && (
            <ModuleCard
              href={msPath("/arrendamientos")}
              icon={Landmark}
              tag="Comercial"
              title="Mis Comercios"
              description="Supervisa los locales comerciales y contratos de arrendamiento vigentes."
              cta="Ver comercios"
            />
          )}
          <ModuleCard
            href={msPath("/comunicados")}
            icon={Megaphone}
            tag="Oficial"
            tagTono="gold"
            title="Comunicados Oficiales"
            description="Noticias, avisos importantes y circulares emitidas por la administración."
            cta="Consultar avisos"
          />
          <ModuleCard
            href={msPath("/tickets")}
            icon={MailPlus}
            tag="Atención"
            tono="terracotta"
            tagTono="terracotta"
            title="Solicitudes y Reportes"
            description="Levanta tickets de mantenimiento, dudas o solicitudes con seguimiento directo."
            cta="Gestionar tickets"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickCard
            href={msPath("/reglamentos")}
            icon={BookOpen}
            title="Reglamentos y Normas"
            description="Consulta los estatutos condominales, manual de convivencia y actas oficiales."
            cta="Ver reglamentos"
          />
          <QuickCard
            href={msPath("/experiencias")}
            icon={Sparkles}
            tono="gold"
            title="Experiencias Val'Quirico"
            description="Descubre eventos, amenidades, gastronomía y actividades exclusivas."
            cta="Ver experiencias"
          />
          <QuickCard
            href={msPath("/campos-contacto")}
            icon={Phone}
            tono="terracotta"
            title="Teléfonos y Emergencia"
            description="Directorio de seguridad, administración, guardia y atención 24/7."
            cta="Ver teléfonos"
          />
          <QuickCard
            href="https://www.mapavalquirico.com/"
            icon={MapPin}
            title="Mapa de Val'Quirico"
            description="Explorador de calles, zonas residenciales y puntos de interés."
            cta="Abrir mapa"
            external
          />
        </div>
      </section>

      {/* ─── Últimos comunicados del condominio ───────────────────────────── */}
      <UltimosComunicados comunicados={comunicadosRecientes} timeZone={timeZone} onOpen={openSidePanel} />

      {/* ─── ¿Necesitas ayuda? ────────────────────────────────────────────── */}
      <AyudaContacto campos={camposContacto} />

      {/* ─── Pie y aviso de privacidad ────────────────────────────────────── */}
      <footer className="space-y-4 pb-2 text-center">
        {sintesisAviso ? (
          <aside className="mx-auto max-w-2xl rounded-2xl border border-stroke-2 bg-surface-2 p-5 text-left">
            <div className="flex items-start gap-3">
              <Shield aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-fg">Aviso de Privacidad</h3>
                <div
                  className="mt-1.5 whitespace-pre-line text-[13px] leading-5 text-fg-3"
                  dangerouslySetInnerHTML={{ __html: sintesisAviso }}
                />
                <Link
                  href={msPath("/aviso-privacidad")}
                  className="group mt-3 inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-brand outline-none transition-colors duration-150 hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45"
                >
                  Leer Aviso de Privacidad completo
                  <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
                </Link>
              </div>
            </div>
          </aside>
        ) : (
          <Link
            href={msPath("/aviso-privacidad")}
            className="inline-flex items-center gap-2 rounded text-[13px] font-medium text-fg-3 outline-none transition-colors duration-150 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/45"
          >
            <Shield aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            Ver Aviso de Privacidad
          </Link>
        )}
        <p className="text-[12px] text-fg-4">Insulae 2.0 · Minisitio Condóminos · Val&apos;Quirico</p>
      </footer>

      {/* ─── Detalle del comunicado ───────────────────────────────────────── */}
      <SidePanel
        open={showSidePanel && Boolean(seleccionado)}
        onClose={closeSidePanel}
        title={seleccionado?.titulo ?? ""}
        subtitle={[seleccionado?.categoria || "Comunicado", fechaSeleccionado].filter(Boolean).join(" · ")}
        icon={<Megaphone className="h-5 w-5" strokeWidth={1.75} />}
      >
        {seleccionado && (
          <div className="space-y-6 p-5 sm:p-6">
            {seleccionado.imagen && (
              <div className="overflow-hidden rounded-xl border border-stroke-2 bg-surface-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={seleccionado.imagen} alt={seleccionado.titulo} className="max-h-[420px] w-full object-contain" />
              </div>
            )}

            {seleccionado.descripcion && seleccionado.descripcion.trim() !== seleccionado.titulo.trim() && (
              <div>
                <h3 className="text-[12px] font-semibold text-fg-3">Descripción</h3>
                <p className="mt-1.5 whitespace-pre-line text-[15px] leading-6 text-fg-2">{seleccionado.descripcion}</p>
              </div>
            )}

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-stroke-3 bg-surface-2 p-4">
                <dt className="flex items-center gap-2 text-[12px] font-semibold text-fg-3">
                  <Calendar aria-hidden className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
                  Fecha
                </dt>
                <dd className="mt-1 text-[14px] font-medium text-fg">{fechaSeleccionado || "Fecha no especificada"}</dd>
              </div>
              <div className="rounded-xl border border-stroke-3 bg-surface-2 p-4">
                <dt className="flex items-center gap-2 text-[12px] font-semibold text-fg-3">
                  <Star aria-hidden className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
                  Categoría
                </dt>
                <dd className="mt-1 text-[14px] font-medium text-fg">{seleccionado.categoria || "General"}</dd>
              </div>
              {vigenciaSeleccionado && (
                <div className="rounded-xl border border-stroke-3 bg-surface-2 p-4 sm:col-span-2">
                  <dt className="flex items-center gap-2 text-[12px] font-semibold text-fg-3">
                    <Clock aria-hidden className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
                    Vigente hasta
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium text-fg">{vigenciaSeleccionado}</dd>
                </div>
              )}
            </dl>

            {seleccionado.pdf && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke-2 bg-card p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                    <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-semibold text-fg">Documento adjunto</h4>
                    <p className="text-[13px] text-fg-3">Ver documento oficial en PDF</p>
                  </div>
                </div>
                <a
                  href={seleccionado.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 active:bg-brand-deep"
                >
                  Abrir PDF
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
                </a>
              </div>
            )}
          </div>
        )}
      </SidePanel>
    </div>
  );
}
