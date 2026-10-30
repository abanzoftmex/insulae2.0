"use client";

/**
 * "Últimos Comunicados" de Bienvenida: el más reciente destacado y los demás en lista.
 *
 * Casi todas las imágenes son carteles verticales (600×776 a 600×1066): recortarlas a 16:9
 * dejaba solo su centro (el de la Asamblea salía negro). El destacado muestra el cartel entero
 * sobre una versión desenfocada de sí mismo y la lista usa miniaturas verticales. Un aviso sin
 * imagen lleva la portada ilustrada (`ComunicadoCover`) en lugar de un hueco en blanco.
 */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Bell, FileText } from "lucide-react";
import { msPath } from "@/components/minisitio/paths";
import { ComunicadoCover, ValquiricoVista } from "@/components/minisitio/valquirico-art";

/** Comunicado tal como lo pinta el panel (mismo formato que armaba el componente viejo). */
export interface ComunicadoPanel {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string | null;
  fechaVigencia: string | null;
  categoria: string;
  imagen: string | null;
  pdf: string | null;
}

const NUEVO_MS = 7 * 24 * 60 * 60 * 1000;

function parseFecha(fecha: string | null): Date | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? null : d;
}

const sinSuscripcion = () => () => {};

/** Publicado hace menos de una semana. Solo en el navegador: el servidor no sabe la hora del condómino. */
function useEsNuevo(fecha: Date | null) {
  const t = fecha?.getTime() ?? null;
  return useSyncExternalStore(
    sinSuscripcion,
    () => (t === null ? false : Date.now() - t < NUEVO_MS),
    () => false,
  );
}

function formatFecha(fecha: string | null, timeZone: string | undefined, options: Intl.DateTimeFormatOptions) {
  const d = parseFecha(fecha);
  return d ? d.toLocaleDateString("es-MX", { ...options, timeZone }) : "";
}

/** Muchos avisos repiten el título como descripción: no se pinta dos veces. */
function descripcionPropia(c: ComunicadoPanel) {
  return c.descripcion && c.descripcion.trim() !== c.titulo.trim() ? c.descripcion : "";
}

function Meta({ comunicado, timeZone, compact = false }: { comunicado: ComunicadoPanel; timeZone: string | undefined; compact?: boolean }) {
  const fecha = formatFecha(comunicado.fecha, timeZone, { year: "numeric", month: "short", day: "numeric" });
  return (
    <span className={`flex min-w-0 items-center gap-x-1.5 text-[12.5px] leading-5 text-fg-3 ${compact ? "whitespace-nowrap" : "flex-wrap"}`}>
      <time dateTime={comunicado.fecha ?? undefined} className="shrink-0" suppressHydrationWarning>
        {fecha || "Fecha no especificada"}
      </time>
      {!compact && (
        <>
          <span aria-hidden className="text-fg-4">
            ·
          </span>
          <span className="min-w-0 truncate">{comunicado.categoria || "General"}</span>
        </>
      )}
      {comunicado.pdf && (
        <>
          <span aria-hidden className="text-fg-4">
            ·
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-overdue">
            <FileText aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            PDF
          </span>
        </>
      )}
    </span>
  );
}

function Destacado({
  comunicado,
  timeZone,
  onOpen,
}: {
  comunicado: ComunicadoPanel;
  timeZone: string | undefined;
  onOpen: (c: ComunicadoPanel) => void;
}) {
  const fecha = parseFecha(comunicado.fecha);
  const dia = formatFecha(comunicado.fecha, timeZone, { day: "numeric" });
  const mes = formatFecha(comunicado.fecha, timeZone, { month: "short" }).replace(".", "");
  const nuevo = useEsNuevo(fecha);
  const descripcion = descripcionPropia(comunicado);

  return (
    <button
      type="button"
      onClick={() => onOpen(comunicado)}
      aria-haspopup="dialog"
      className="group @container w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-4"
    >
      <span className="flex flex-col @[36rem]:grid @[36rem]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @[36rem]:items-center @[36rem]:gap-7">
        <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-xl bg-brand-deep shadow-[0_1px_2px_rgb(61_60_34/0.18)]">
          {comunicado.imagen ? (
            <>
              {/* El mismo cartel, desenfocado, llena los costados; encima va completo. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={comunicado.imagen} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl saturate-[1.2]" />
              <span aria-hidden className="absolute inset-0 bg-brand-deep/30" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comunicado.imagen}
                alt=""
                className="relative mx-auto h-full w-auto max-w-full object-contain shadow-[0_12px_36px_-8px_rgb(0_0_0/0.55)] transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:group-hover:scale-100"
              />
            </>
          ) : (
            <ComunicadoCover seed={comunicado.id} />
          )}

          {dia && (
            <span
              aria-hidden
              className="absolute left-3 top-3 flex w-12 flex-col items-center rounded-lg bg-card/95 py-1.5 shadow-[0_2px_8px_-2px_rgb(0_0_0/0.3)] backdrop-blur-sm"
              suppressHydrationWarning
            >
              <span className="text-[19px] font-bold leading-5 tracking-[-0.02em] text-fg tabular-nums" suppressHydrationWarning>
                {dia}
              </span>
              <span className="text-[11.5px] font-medium leading-4 text-fg-3" suppressHydrationWarning>
                {mes}
              </span>
            </span>
          )}
          {nuevo && (
            <span className="absolute right-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-full bg-brand-mint px-2.5 text-[12px] font-semibold text-brand-deep shadow-[0_2px_8px_-2px_rgb(0_0_0/0.3)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-overdue" />
              Nuevo
            </span>
          )}
        </span>

        <span className="mt-4 block px-0.5 @[36rem]:mt-0">
          <Meta comunicado={comunicado} timeZone={timeZone} />
          <span className="mt-1.5 line-clamp-2 text-balance text-[20px] font-bold leading-7 tracking-[-0.015em] text-fg transition-colors duration-150 group-hover:text-brand-deep">
            {comunicado.titulo}
          </span>
          {descripcion && <span className="mt-1.5 line-clamp-2 text-[14px] leading-[22px] text-fg-3">{descripcion}</span>}
          <span className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand transition-colors duration-150 group-hover:text-brand-deep">
            Leer comunicado completo
            <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={2.25} />
          </span>
        </span>
      </span>
    </button>
  );
}

function Fila({
  comunicado,
  timeZone,
  onOpen,
}: {
  comunicado: ComunicadoPanel;
  timeZone: string | undefined;
  onOpen: (c: ComunicadoPanel) => void;
}) {
  const descripcion = descripcionPropia(comunicado);
  return (
    <button
      type="button"
      onClick={() => onOpen(comunicado)}
      aria-haspopup="dialog"
      className="group -mx-2.5 flex w-[calc(100%+20px)] items-center gap-4 rounded-xl p-2.5 text-left outline-none transition-colors duration-150 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/45"
    >
      <span className="relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-surface-3 shadow-[0_1px_2px_rgb(61_60_34/0.15)] ring-1 ring-inset ring-black/[0.06]">
        {comunicado.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comunicado.imagen}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <ComunicadoCover seed={comunicado.id} compact />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <Meta comunicado={comunicado} timeZone={timeZone} compact />
        <span className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-[21px] text-fg transition-colors duration-150 group-hover:text-brand-deep">
          {comunicado.titulo}
        </span>
        {descripcion && <span className="mt-0.5 line-clamp-1 text-[13px] leading-5 text-fg-3">{descripcion}</span>}
      </span>
      <ArrowRight
        aria-hidden
        className="mr-1 h-4 w-4 shrink-0 text-fg-4 opacity-0 transition-[opacity,translate,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-brand group-hover:opacity-100 group-focus-visible:opacity-100"
        strokeWidth={2.25}
      />
    </button>
  );
}

export function UltimosComunicados({
  comunicados,
  timeZone,
  onOpen,
}: {
  comunicados: ComunicadoPanel[];
  timeZone: string | undefined;
  onOpen: (c: ComunicadoPanel) => void;
}) {
  const [primero, ...resto] = comunicados;

  return (
    <section aria-labelledby="bienvenida-comunicados" className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-stroke-3 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-mint sm:inline-flex">
            <Bell aria-hidden className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 id="bienvenida-comunicados" className="text-[18px] font-bold leading-6 tracking-[-0.01em] text-fg">
              Últimos Comunicados
            </h2>
            <p className="truncate text-[13px] leading-5 text-fg-3">Actualizaciones y avisos oficiales para condóminos</p>
          </div>
        </div>
        <Link
          href={msPath("/comunicados")}
          className="group inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-brand outline-none transition-colors duration-150 hover:bg-brand/[0.06] hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45"
        >
          Ver todos
          <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
        </Link>
      </div>

      {!primero ? (
        <div className="px-6 py-10 text-center">
          <ValquiricoVista className="mx-auto h-auto w-full max-w-[260px] opacity-90" />
          <h3 className="mt-5 text-[15px] font-semibold text-fg">No hay comunicados recientes por el momento</h3>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-5 text-fg-3">
            Te notificaremos aquí cuando la administración publique nuevos avisos.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-x-8 gap-y-6 p-5 sm:p-6 ${resto.length ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" : ""}`}>
          <div className={resto.length ? "" : "mx-auto w-full max-w-2xl"}>
            <Destacado comunicado={primero} timeZone={timeZone} onOpen={onOpen} />
          </div>
          {resto.length > 0 && (
            <div className="min-w-0 border-t border-stroke-3 pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
              <h3 className="mb-2 text-[13px] font-semibold text-fg-3">También publicados</h3>
              <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2 xl:grid-cols-1 xl:divide-y xl:divide-stroke-3">
                {resto.map((c) => (
                  <li key={c.id} className="py-1.5 xl:first:pt-0 xl:last:pb-0">
                    <Fila comunicado={c} timeZone={timeZone} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
