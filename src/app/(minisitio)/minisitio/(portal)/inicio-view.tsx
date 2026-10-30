"use client";

/**
 * Inicio del portal: lo primero que ve el condómino. Responde, en este orden, "¿debo algo?"
 * (saldo vencido de todas sus unidades) y "¿qué hay de nuevo?" (avisos y solicitudes). Cada
 * aviso se abre en la vista secundaria, como un hilo de Slack, sin perder la lista.
 */
import { useState } from "react";
import Link from "next/link";
import { CircleCheck, FileText, Phone, Plus } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { SecondaryView } from "@/components/minisitio/shell/secondary-view";
import { buttonClass } from "@/components/minisitio/ui/button";
import { ImageViewer, type ViewerImage } from "@/components/minisitio/ui/image-viewer";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { AdminAvatar, AvisoImagen, AvisoPdf } from "./_avisos/aviso-parts";
import { isPastCalendarDay, useDisplayTimeZone } from "./_lib/client-dates";
import { formatCurrency, formatLongDate, formatShortDate } from "./_lib/format";

export interface CuentaResumen {
  saldoVencido: number;
  saldoPorVencer: number;
  propiedades: { total: number; conAdeudo: number };
  comercios: { total: number; conAdeudo: number };
  /** Si solo una unidad debe: su estado de cuenta, para ir directo. */
  unicaConAdeudo: { nombre: string; href: string } | null;
}

export interface AvisoResumen {
  id: string;
  titulo: string;
  /** Vacío cuando el texto solo repite el título. */
  mensaje: string;
  fecha: string | null;
  vigencia: string | null;
  imagen: string | null;
  pdf: string | null;
}

export interface SolicitudesResumen {
  total: number;
  recientes: { id: string; titulo: string; departamento: string | null; fecha: string | null; respondida: boolean }[];
}

export interface TelefonoEmergencia {
  id: string;
  nombre: string;
  numero: string;
  href: string;
}

interface InicioViewProps {
  /** `null` si no se pudo cargar (no es lo mismo que no deber nada). */
  cuenta: CuentaResumen | null;
  avisos: AvisoResumen[] | null;
  solicitudes: SolicitudesResumen | null;
  telefonos: TelefonoEmergencia[];
}

function saludo(ahora: Date, timeZone?: string): string {
  const hora = Number(new Intl.DateTimeFormat("es-MX", { hour: "numeric", hourCycle: "h23", timeZone }).format(ahora));
  if (hora >= 5 && hora < 12) return "Buenos días";
  return hora >= 12 && hora < 19 ? "Buenas tardes" : "Buenas noches";
}

function hoy(ahora: Date, timeZone?: string): string {
  const texto = ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "70 de tus 86 propiedades tienen saldo vencido." y lo mismo para comercios. */
function lineaUnidades(con: number, total: number, [una, varias]: [string, string]): string | null {
  if (total === 0) return null;
  if (con === 0) return total === 1 ? `Tu ${una} está al corriente.` : `Tus ${total} ${varias} están al corriente.`;
  if (total === 1) return `Tu ${una} tiene saldo vencido.`;
  return `${con} de tus ${total} ${varias} ${con === 1 ? "tiene" : "tienen"} saldo vencido.`;
}

export function InicioView({ cuenta, avisos, solicitudes, telefonos }: InicioViewProps) {
  const { user } = useMinisitioSession();
  const timeZone = useDisplayTimeZone();
  const [ahora] = useState(() => new Date());
  // El aviso se conserva al cerrar para que el panel no se vacíe mientras sale.
  const [panel, setPanel] = useState<{ aviso: AvisoResumen | null; open: boolean }>({ aviso: null, open: false });
  const [imagen, setImagen] = useState<ViewerImage | null>(null);
  const nombre = user?.nombre?.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="@container mx-auto w-full max-w-[1040px]">
      <div className="mb-6">
        <p className="text-body text-fg-3" suppressHydrationWarning>
          {hoy(ahora, timeZone)}
        </p>
        <p className="mt-0.5 text-title font-bold text-fg" suppressHydrationWarning>
          {saludo(ahora, timeZone)}
          {nombre && `, ${nombre}`}
        </p>
      </div>

      <Cuenta cuenta={cuenta} />

      <div className="mt-8 grid gap-x-10 gap-y-8 @[52rem]:grid-cols-[minmax(0,1fr)_288px]">
        <Avisos
          avisos={avisos}
          abiertoId={panel.open ? panel.aviso?.id : undefined}
          onOpen={(aviso) => setPanel({ aviso, open: true })}
          timeZone={timeZone}
        />
        <div className="space-y-8">
          <Solicitudes solicitudes={solicitudes} timeZone={timeZone} />
          <Telefonos telefonos={telefonos} />
        </div>
      </div>

      <SecondaryView
        open={panel.open}
        onClose={() => setPanel((p) => ({ ...p, open: false }))}
        title="Aviso"
        context={panel.aviso ? formatShortDate(panel.aviso.fecha, timeZone) : undefined}
      >
        {panel.aviso && <AvisoDetalle aviso={panel.aviso} timeZone={timeZone} onImage={setImagen} />}
      </SecondaryView>
      <ImageViewer image={imagen} onClose={() => setImagen(null)} />
    </div>
  );
}

function SectionHeader({ id, title, href, linkLabel, linkAria }: { id: string; title: string; href?: string; linkLabel?: string; linkAria?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-body-lg font-bold text-fg">
        {title}
      </h2>
      {href && linkLabel && (
        <Link
          href={msPath(href)}
          aria-label={linkAria}
          className="shrink-0 rounded-ctrl text-body font-medium text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function Cuenta({ cuenta }: { cuenta: CuentaResumen | null }) {
  if (cuenta === null) return <LoadError what="tu saldo" />;
  if (cuenta.propiedades.total + cuenta.comercios.total === 0) return null;

  const debe = cuenta.saldoVencido > 0;
  const detalle = [
    lineaUnidades(cuenta.propiedades.conAdeudo, cuenta.propiedades.total, ["propiedad", "propiedades"]),
    lineaUnidades(cuenta.comercios.conAdeudo, cuenta.comercios.total, ["comercio", "comercios"]),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-labelledby="inicio-cuenta" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-panel border border-stroke-2 px-5 py-4">
      <div className="min-w-0">
        {debe ? (
          <>
            <h2 id="inicio-cuenta" className="text-body font-semibold text-overdue">
              Saldo vencido
            </h2>
            <p className="text-display font-bold text-fg tabular-nums">{formatCurrency(cuenta.saldoVencido)}</p>
            <p className="mt-0.5 text-body text-fg-3">{detalle}</p>
          </>
        ) : (
          <>
            <h2 id="inicio-cuenta" className="flex items-center gap-2 text-subtitle font-bold text-fg">
              <CircleCheck className="h-5 w-5 shrink-0 text-success" strokeWidth={2.25} aria-hidden />
              Estás al corriente
            </h2>
            <p className="mt-0.5 text-body text-fg-3">
              {cuenta.saldoPorVencer > 0 ? (
                <>
                  Por vencer: <span className="font-semibold text-fg tabular-nums">{formatCurrency(cuenta.saldoPorVencer)}</span>
                </>
              ) : (
                "No tienes saldos pendientes."
              )}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {cuenta.unicaConAdeudo && (
          <Link href={msPath(cuenta.unicaConAdeudo.href)} className={buttonClass("outline")} aria-label={`Estado de cuenta de ${cuenta.unicaConAdeudo.nombre}`}>
            Estado de cuenta
          </Link>
        )}
        <Link href={msPath("/dashboard")} className={buttonClass(debe ? "primary" : "outline")}>
          Ver mis saldos
        </Link>
      </div>
      {debe && cuenta.saldoPorVencer > 0 && (
        <p className="basis-full border-t border-stroke-3 pt-3 text-body text-fg-3">
          Además, por vencer: <span className="font-semibold text-fg tabular-nums">{formatCurrency(cuenta.saldoPorVencer)}</span>
        </p>
      )}
    </section>
  );
}

function Avisos({
  avisos,
  abiertoId,
  onOpen,
  timeZone,
}: {
  avisos: AvisoResumen[] | null;
  abiertoId?: string;
  onOpen: (aviso: AvisoResumen) => void;
  timeZone?: string;
}) {
  return (
    <section aria-labelledby="inicio-avisos" className="min-w-0">
      <SectionHeader id="inicio-avisos" title="Avisos recientes" href="/comunicados" linkLabel="Ver todos" linkAria="Ver todos los avisos" />
      {avisos === null ? (
        <LoadError what="los avisos" />
      ) : avisos.length === 0 ? (
        <p className="rounded-panel border border-stroke-2 px-4 py-6 text-center text-body text-fg-3">Todavía no hay avisos.</p>
      ) : (
        <ul className="-mx-3">
          {avisos.map((aviso) => {
            const abierto = aviso.id === abiertoId;
            return (
              <li key={aviso.id}>
                <button
                  type="button"
                  onClick={() => onOpen(aviso)}
                  aria-current={abierto ? "true" : undefined}
                  className={`flex w-full gap-2 rounded-panel px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    abierto ? "bg-highlight" : "hover:bg-surface-2"
                  }`}
                >
                  <AdminAvatar />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-body font-bold text-fg">Administración</span>
                      <time dateTime={aviso.fecha ?? undefined} className="text-caption text-fg-3" suppressHydrationWarning>
                        {formatShortDate(aviso.fecha, timeZone)}
                      </time>
                    </span>
                    <span className="block text-message font-semibold text-fg">{aviso.titulo}</span>
                    {aviso.mensaje && <span className="line-clamp-2 text-message text-fg-2">{aviso.mensaje}</span>}
                    {aviso.pdf && (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-caption font-medium text-fg-3">
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                        PDF adjunto
                      </span>
                    )}
                  </span>
                  {aviso.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element -- imágenes de la 1.0 en otro host
                    <img src={aviso.imagen} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-surface border border-stroke-3 object-cover" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AvisoDetalle({ aviso, timeZone, onImage }: { aviso: AvisoResumen; timeZone?: string; onImage: (image: ViewerImage) => void }) {
  const vigencia = formatLongDate(aviso.vigencia, timeZone);
  return (
    <article className="space-y-4">
      <div className="flex items-center gap-2">
        <AdminAvatar />
        <div className="min-w-0">
          <p className="text-body font-bold text-fg">Administración Val&apos;Quirico</p>
          <p className="text-caption text-fg-3">
            <time dateTime={aviso.fecha ?? undefined}>{formatLongDate(aviso.fecha, timeZone)}</time>
          </p>
        </div>
      </div>
      <h3 className="text-subtitle font-bold text-fg">{aviso.titulo}</h3>
      {aviso.mensaje && <p className="text-message whitespace-pre-line text-fg">{aviso.mensaje}</p>}
      {aviso.imagen && <AvisoImagen src={aviso.imagen} titulo={aviso.titulo} onOpen={() => onImage({ src: aviso.imagen ?? "", title: aviso.titulo })} />}
      {aviso.pdf && <AvisoPdf href={aviso.pdf} />}
      {vigencia && (
        <p className="text-caption text-fg-3">
          {isPastCalendarDay(aviso.vigencia, timeZone) ? `Estuvo vigente hasta el ${vigencia}.` : `Vigente hasta el ${vigencia}.`}
        </p>
      )}
    </article>
  );
}

function Solicitudes({ solicitudes, timeZone }: { solicitudes: SolicitudesResumen | null; timeZone?: string }) {
  return (
    <section aria-labelledby="inicio-solicitudes">
      <SectionHeader
        id="inicio-solicitudes"
        title="Tus solicitudes"
        href="/tickets"
        linkLabel="Ver todas"
        linkAria="Ver todas tus solicitudes"
      />
      {solicitudes === null ? (
        <LoadError what="tus solicitudes" />
      ) : solicitudes.recientes.length === 0 ? (
        <div className="rounded-panel border border-stroke-2 p-4">
          <p className="text-body text-fg-2">No tienes solicitudes abiertas.</p>
          <Link href={msPath("/tickets?nueva=1")} className={buttonClass("outline", "sm", "mt-3")}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nueva solicitud
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stroke-3 overflow-hidden rounded-panel border border-stroke-2">
          {solicitudes.recientes.map((s) => (
            <li key={s.id}>
              <Link href={msPath("/tickets")} className="block px-4 py-2.5 outline-none hover:bg-surface-2 focus-visible:bg-surface-2">
                <span className="block truncate text-body font-semibold text-fg">{s.titulo}</span>
                <span className="flex items-center gap-1.5 text-caption text-fg-3">
                  <span className="truncate">{s.departamento || "Administración"}</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0" suppressHydrationWarning>
                    {formatShortDate(s.fecha, timeZone)}
                  </span>
                  {s.respondida && <span className="ml-auto shrink-0 font-semibold text-brand">Respondida</span>}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={msPath("/tickets?nueva=1")}
              className="flex items-center gap-1.5 px-4 py-2.5 text-body font-semibold text-brand outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Nueva solicitud
            </Link>
          </li>
        </ul>
      )}
    </section>
  );
}

function Telefonos({ telefonos }: { telefonos: TelefonoEmergencia[] }) {
  if (telefonos.length === 0) return null;
  return (
    <section aria-labelledby="inicio-telefonos">
      <SectionHeader id="inicio-telefonos" title="Emergencias" href="/campos-contacto" linkLabel="Todos" linkAria="Todos los teléfonos de emergencia" />
      <ul className="divide-y divide-stroke-3 rounded-panel border border-stroke-2">
        {telefonos.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold text-fg">{t.nombre}</span>
              <span className="block text-caption text-fg-3 tabular-nums">{t.numero}</span>
            </span>
            <a href={t.href} aria-label={`Llamar a ${t.nombre}, ${t.numero}`} className={buttonClass("outline", "sm")}>
              <Phone className="h-3.5 w-3.5" aria-hidden />
              Llamar
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
