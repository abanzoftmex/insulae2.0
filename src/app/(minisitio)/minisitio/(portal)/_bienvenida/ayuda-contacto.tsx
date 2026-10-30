"use client";

/**
 * "¿Necesitas ayuda?" de Bienvenida.
 *
 * Los contactos llegan en una sola lista ordenada por la administración. Antes se pintaban
 * catorce tarjetas iguales, y la dirección de las oficinas descuadraba su fila. Ahora se
 * reparten en dos partes:
 * - la tarjeta de la administración: ilustración, dirección y los canales (teléfono, WhatsApp,
 *   correo), cada uno con su color y su acción;
 * - el directorio de teléfonos, agrupado por el nombre del contacto (emergencias, casetas,
 *   experiencias). Lo que no encaja en ningún grupo va a "Más teléfonos".
 * Arriba, si en este momento es horario de atención (en la hora de Val'Quirico).
 */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight, HeartPulse, Mail, MailPlus, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { ValquiricoVista } from "@/components/minisitio/valquirico-art";
import type { CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { MINISITIO_TIME_ZONE } from "../_lib/client-dates";

const HORARIO = { abre: 9 * 60 + 30, cierra: 18 * 60, texto: "Atención de 9:30 a 18:00, de lunes a viernes" };

type Estado = "abierto" | "antes" | "manana" | "lunes";

const ESTADO_TEXTO: Record<Estado, string> = {
  abierto: "En horario de atención · hasta las 18:00",
  antes: "Fuera de horario · abre hoy a las 9:30",
  manana: "Fuera de horario · abre mañana a las 9:30",
  lunes: "Fuera de horario · abre el lunes a las 9:30",
};

const DIAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const relojCondominio = new Intl.DateTimeFormat("en-US", {
  timeZone: MINISITIO_TIME_ZONE,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function estadoAtencion(): Estado {
  const parts = relojCondominio.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const dia = DIAS.indexOf(get("weekday"));
  const minuto = Number(get("hour")) * 60 + Number(get("minute"));
  const habil = dia >= 1 && dia <= 5;
  if (habil && minuto >= HORARIO.abre && minuto < HORARIO.cierra) return "abierto";
  if (habil && minuto < HORARIO.abre) return "antes";
  // Domingo, o de lunes a jueves ya cerrado: abre al día siguiente. Viernes cerrado y sábado: el lunes.
  return dia === 0 || (dia >= 1 && dia <= 4) ? "manana" : "lunes";
}

const cadaMinuto = (cb: () => void) => {
  const id = setInterval(cb, 30_000);
  return () => clearInterval(id);
};

/** `null` en el servidor y al hidratar: la hora del servidor no es la del navegador. */
function useEstadoAtencion(): Estado | null {
  return useSyncExternalStore(cadaMinuto, estadoAtencion, () => null);
}

function fold(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Diez dígitos seguidos se leen mejor en grupos de 3-3-4, como se dictan en México. */
function formatPhone(text: string): string {
  const t = text.trim();
  return /^\d{10}$/.test(t) ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t;
}

/** Teléfono escrito solo con dígitos y separadores: en el celular se vuelve un enlace para llamar. */
function telHref(text: string): string | null {
  const t = text.trim();
  if (!/^\+?[\d\s().-]{7,}$/.test(t)) return null;
  const digits = t.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : null;
}

// Un teléfono es canal de la administración si se llama así ("Teléfono", "Oficinas"…);
// correo, WhatsApp y dirección lo son siempre.
const CANAL_PRINCIPAL = /^(telefono|tel\b|administracion|oficina)/;

const GRUPOS: { key: string; titulo: string; icon: LucideIcon; urgente?: boolean; test: RegExp }[] = [
  {
    key: "emergencias",
    titulo: "Emergencias",
    icon: HeartPulse,
    urgente: true,
    test: /param[e]?dic|emergenc|ambulanc|bomber|polic|cruz roja|proteccion civil|medic/,
  },
  { key: "vigilancia", titulo: "Casetas de vigilancia", icon: ShieldCheck, test: /caseta|vigilan|seguridad|guardia|acceso/ },
  { key: "experiencias", titulo: "Experiencias Val'Quirico", icon: Sparkles, test: /experiencia|tour|evento|foto/ },
];
const OTROS = { key: "otros", titulo: "Más teléfonos", icon: Phone };

type Canal = { tono: string; accion: string; icon: LucideIcon };

const CANAL: Record<string, Canal> = {
  Phone: { tono: "bg-brand/[0.08] text-brand group-hover:bg-brand group-hover:text-white", accion: "Llamar", icon: Phone },
  MessageCircle: { tono: "bg-success-bg text-success group-hover:bg-success group-hover:text-white", accion: "Escribir", icon: MessageCircle },
  Mail: { tono: "bg-brand-accent/[0.12] text-warning group-hover:bg-warning group-hover:text-white", accion: "Enviar correo", icon: Mail },
};

function contactoHref(campo: CampoContacto) {
  return campo.enlace || telHref(campo.contenido);
}

function linkProps(campo: CampoContacto) {
  const externo = Boolean(campo.enlace) && campo.target === "_blank";
  return externo ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function EstadoAtencion() {
  const estado = useEstadoAtencion();
  if (!estado) return null;
  const abierto = estado === "abierto";
  return (
    <p
      className={`inline-flex h-7 animate-fade-in items-center gap-2 rounded-full px-3 text-[12.5px] font-medium ${
        abierto ? "bg-success-bg text-success" : "bg-surface-3 text-fg-3"
      }`}
    >
      <span aria-hidden className={`relative inline-flex h-2 w-2 rounded-full ${abierto ? "status-live bg-success" : "bg-fg-4"}`} />
      {ESTADO_TEXTO[estado]}
    </p>
  );
}

function CanalFila({ campo }: { campo: CampoContacto }) {
  const canal = CANAL[campo.icono] ?? CANAL.Phone;
  const Icon = canal.icon;
  const href = contactoHref(campo);
  const valor = formatPhone(campo.contenido);
  const accionVisible = valor.length <= 18;
  // Un correo largo se parte después de la arroba, no en la última letra.
  const arroba = valor.indexOf("@");
  const body = (
    <>
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${canal.tono}`}>
        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-4 text-fg-3">{campo.titulo}</span>
        <span className="block text-[14px] font-semibold leading-5 text-fg tabular-nums [overflow-wrap:anywhere]">
          {arroba > 0 ? (
            <>
              {valor.slice(0, arroba + 1)}
              <wbr />
              {valor.slice(arroba + 1)}
            </>
          ) : (
            valor
          )}
        </span>
      </span>
      {href && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-fg-3 transition-colors duration-150 group-hover:text-brand-deep">
          <span className={accionVisible ? "hidden sm:inline" : "sr-only"}>{canal.accion}</span>
          <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={2.25} />
        </span>
      )}
    </>
  );
  const className =
    "group flex items-center gap-3 rounded-xl bg-card px-3 py-2 shadow-[0_0_0_1px_rgb(61_60_34/0.07),0_1px_2px_rgb(61_60_34/0.06)] outline-none transition-[box-shadow,translate] duration-200 ease-out";
  return href ? (
    <a
      href={href}
      {...linkProps(campo)}
      className={`${className} hover:-translate-y-px hover:shadow-[0_0_0_1px_rgb(61_60_34/0.1),0_6px_16px_-8px_rgb(61_60_34/0.35)] focus-visible:ring-2 focus-visible:ring-brand/45 active:translate-y-0 motion-reduce:hover:translate-y-0`}
    >
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Direccion({ campo }: { campo: CampoContacto }) {
  const href = campo.enlace;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-terracotta/[0.09] text-terracotta">
        <MapPin aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <h4 className="text-[14px] font-semibold leading-5 text-fg">{campo.titulo}</h4>
        <address className="mt-0.5 text-[13px] not-italic leading-5 text-fg-2">{campo.contenido}</address>
        {href && (
          <a
            href={href}
            {...linkProps(campo)}
            className="group mt-1.5 inline-flex items-center gap-1 rounded text-[12.5px] font-semibold text-terracotta outline-none transition-colors duration-150 hover:text-[#78230b] focus-visible:ring-2 focus-visible:ring-brand/45"
          >
            Cómo llegar
            <ArrowUpRight
              aria-hidden
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
              strokeWidth={2.25}
            />
            {linkProps(campo).target && <span className="sr-only">(se abre en otra pestaña)</span>}
          </a>
        )}
      </div>
    </div>
  );
}

function Solicitud() {
  return (
    <Link
      href={msPath("/tickets")}
      className="group flex items-center gap-3 rounded-xl border border-dashed border-nav-line bg-nav/60 px-4 py-3 text-[13px] leading-5 text-fg-2 outline-none transition-colors duration-150 hover:border-brand/40 hover:bg-nav focus-visible:ring-2 focus-visible:ring-brand/45"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/[0.08] text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-white">
        <MailPlus aria-hidden className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        ¿No es urgente o no encuentras a quién llamar? <span className="font-semibold text-brand">Levanta una solicitud</span> y dale
        seguimiento desde el portal.
      </span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-brand transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
    </Link>
  );
}

function Directorio({ grupos }: { grupos: { key: string; titulo: string; icon: LucideIcon; urgente?: boolean; campos: CampoContacto[] }[] }) {
  return (
    <div className="@container flex min-w-0 flex-col gap-6">
      <div className="gap-6 @[34rem]:columns-2">
        {grupos.map((grupo) => {
          const Icon = grupo.icon;
          return (
            <section key={grupo.key} aria-labelledby={`ayuda-${grupo.key}`} className="mb-6 break-inside-avoid last:mb-0">
              <h3 id={`ayuda-${grupo.key}`} className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold text-fg-2">
                <Icon aria-hidden className={`h-4 w-4 ${grupo.urgente ? "text-overdue" : "text-brand"}`} strokeWidth={2} />
                {grupo.titulo}
                <span className="font-normal text-fg-4 tabular-nums">{grupo.campos.length}</span>
              </h3>
              <ul
                className={`overflow-hidden rounded-xl border ${
                  grupo.urgente ? "border-overdue/20 bg-critical-bg/60" : "border-stroke-2 bg-card"
                } divide-y ${grupo.urgente ? "divide-overdue/10" : "divide-stroke-3"}`}
              >
                {grupo.campos.map((campo) => {
                  const href = contactoHref(campo);
                  const fila = (
                    <>
                      <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-5 text-fg">{campo.titulo}</span>
                      <span className={`shrink-0 text-[13.5px] tabular-nums ${grupo.urgente ? "font-semibold text-overdue" : "text-fg-2"}`}>
                        {formatPhone(campo.contenido)}
                      </span>
                      {href && (
                        <Phone
                          aria-hidden
                          className="h-3.5 w-3.5 shrink-0 text-fg-4 transition-[color,scale] duration-200 group-hover:scale-110 group-hover:text-brand"
                          strokeWidth={2}
                        />
                      )}
                    </>
                  );
                  return (
                    <li key={campo.id}>
                      {href ? (
                        <a
                          href={href}
                          {...linkProps(campo)}
                          className={`group flex items-center gap-3 px-3.5 py-2.5 outline-none transition-colors duration-150 focus-visible:bg-surface-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/45 ${
                            grupo.urgente ? "hover:bg-critical-bg" : "hover:bg-surface-2"
                          }`}
                        >
                          {fila}
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 px-3.5 py-2.5">{fila}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <Solicitud />
    </div>
  );
}

export function AyudaContacto({ campos }: { campos: CampoContacto[] }) {
  const principales = campos.filter((c) => c.icono !== "Phone" || CANAL_PRINCIPAL.test(fold(c.titulo)));
  const direcciones = principales.filter((c) => c.icono === "Building" || c.icono === "MapPin");
  const canales = principales.filter((c) => !direcciones.includes(c));

  const resto = campos.filter((c) => !principales.includes(c));
  const grupos = [...GRUPOS, { ...OTROS, test: null }]
    .map((g) => ({
      ...g,
      campos: resto.filter((c) => {
        const titulo = fold(c.titulo);
        const propio = GRUPOS.find((x) => x.test.test(titulo));
        return g.test ? propio === g : !propio;
      }),
    }))
    .filter((g) => g.campos.length > 0);

  return (
    <section aria-labelledby="bienvenida-ayuda" className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stroke-3 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="bienvenida-ayuda" className="text-[18px] font-bold leading-6 tracking-[-0.01em] text-fg">
            ¿Necesitas ayuda?
          </h2>
          <p className="text-[13px] leading-5 text-fg-3">{HORARIO.texto}</p>
        </div>
        <EstadoAtencion />
      </div>

      {campos.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <ValquiricoVista className="mx-auto h-auto w-full max-w-[260px] opacity-90" />
          <p className="mt-4 text-[13.5px] text-fg-3">No hay campos de contacto disponibles</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-6 p-5 sm:p-6 ${grupos.length ? "xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]" : ""}`}>
          {/* Tarjeta de la administración. Angosta (junto al directorio o en el celular) va en
              columna con la ilustración arriba; a lo ancho, la dirección y la ilustración a la
              izquierda y los canales a la derecha. */}
          <div className="vq-scene @container overflow-hidden rounded-2xl border border-nav-line-soft bg-nav">
            <div className="flex h-full flex-col @[38rem]:grid @[38rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col">
                <ValquiricoVista className="order-first block h-auto w-full @[38rem]:order-last @[38rem]:mt-auto" />
                <div className="space-y-4 border-t border-nav-line px-4 pt-4 sm:px-5 @[38rem]:border-t-0 @[38rem]:pb-4 @[38rem]:pt-5">
                  <div>
                    <p className="text-[12px] font-semibold leading-4 text-nav-label">Administración del condominio</p>
                    <p className="mt-0.5 text-[13px] leading-5 text-fg-3">Escríbenos o llámanos; con gusto te atendemos.</p>
                  </div>
                  {direcciones.map((campo) => (
                    <Direccion key={campo.id} campo={campo} />
                  ))}
                </div>
              </div>
              {canales.length > 0 ? (
                <ul className="space-y-2 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 @[38rem]:self-center @[38rem]:py-5 @[38rem]:pl-0">
                  {canales.map((campo) => (
                    <li key={campo.id}>
                      <CanalFila campo={campo} />
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="pb-4" />
              )}
            </div>
          </div>

          {grupos.length > 0 ? (
            <Directorio grupos={grupos} />
          ) : (
            <Solicitud />
          )}
        </div>
      )}
    </section>
  );
}
