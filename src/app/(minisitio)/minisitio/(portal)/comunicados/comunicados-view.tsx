"use client";

/**
 * Avisos (`/minisitio/comunicados`) como un canal de Slack: los comunicados de la administración,
 * del más reciente al más antiguo, agrupados por día con la fecha fija arriba mientras se
 * desplaza. Lo publicado desde la visita anterior (en este dispositivo) se marca como nuevo, y
 * entrar lo da por visto. Las imágenes se amplían en el visor; los PDF se abren aparte.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Comunicado } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { SPRING } from "@/components/minisitio/motion";
import { useMinisitioSession } from "@/components/minisitio/session-provider";
import { buttonClass } from "@/components/minisitio/ui/button";
import { ImageViewer, type ViewerImage } from "@/components/minisitio/ui/image-viewer";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { esAvisoNuevo, useMinisitioNavStore } from "@/stores/minisitio-nav.store";
import { AdminAvatar, AvisoImagen, AvisoPdf } from "../_avisos/aviso-parts";
import { isPastCalendarDay, useDisplayTimeZone } from "../_lib/client-dates";
import { comunicadoFileUrl } from "../_lib/comunicado-file-url";
import { calendarDay, formatDayLabel, formatLongDate } from "../_lib/format";

type Filtro = "todos" | "vigentes";

interface Aviso {
  id: string;
  titulo: string;
  /** Vacío cuando el texto solo repite el título. */
  mensaje: string;
  fecha: string | null;
  vigencia: string | null;
  imagen: string | null;
  pdf: string | null;
}

function toAviso(c: Comunicado): Aviso {
  const titulo = c.nombre?.trim() || "Aviso";
  const mensaje = c.descripcion?.trim() ?? "";
  return {
    id: c.id_notificaciones,
    titulo,
    mensaje: mensaje && mensaje !== titulo ? mensaje : "",
    fecha: c.fechaPublicar,
    vigencia: c.fechaVigencia,
    imagen: c.imagen ? comunicadoFileUrl(c.imagen) : null,
    pdf: c.pdf ? comunicadoFileUrl(c.pdf) : null,
  };
}

const publicado = (aviso: Aviso) => Date.parse(aviso.fecha ?? "") || 0;

export function ComunicadosView({ comunicados }: { comunicados: Comunicado[] | null }) {
  const { user } = useMinisitioSession();
  const timeZone = useDisplayTimeZone();
  const markAvisosVistos = useMinisitioNavStore((s) => s.markAvisosVistos);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [imagen, setImagen] = useState<ViewerImage | null>(null);
  const [ahora] = useState(() => new Date());
  // Hasta qué aviso se había visto ANTES de entrar. `undefined` mientras no se sabe (servidor e
  // hidratación): nada se marca como nuevo. El ref sobrevive al doble efecto de StrictMode.
  const vistoAntes = useRef<string | null | undefined>(undefined);
  const [visita, setVisita] = useState<{ visto: string | null } | undefined>(undefined);

  const avisos = useMemo(() => (comunicados ?? []).map(toAviso).sort((a, b) => publicado(b) - publicado(a)), [comunicados]);
  const ultimo = avisos.find((a) => a.fecha)?.fecha ?? null;

  // El shell rehidrata el store en un layout effect, que corre antes que este efecto.
  useEffect(() => {
    if (!user) return;
    if (vistoAntes.current === undefined) vistoAntes.current = useMinisitioNavStore.getState().avisosVistos[user.id] ?? null;
    setVisita({ visto: vistoAntes.current });
    if (ultimo) markAvisosVistos(user.id, ultimo);
  }, [user, ultimo, markAvisosVistos]);

  const vigentes = avisos.filter((a) => !isPastCalendarDay(a.vigencia, timeZone));
  const visibles = filtro === "vigentes" ? vigentes : avisos;

  const grupos = useMemo(() => {
    const out: { dia: string; label: string; avisos: Aviso[] }[] = [];
    for (const aviso of visibles) {
      const dia = calendarDay(aviso.fecha, timeZone) || "sin-fecha";
      const actual = out[out.length - 1];
      if (actual?.dia === dia) actual.avisos.push(aviso);
      else out.push({ dia, label: formatDayLabel(aviso.fecha, ahora, timeZone), avisos: [aviso] });
    }
    return out;
  }, [visibles, ahora, timeZone]);

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div role="tablist" aria-label="Mostrar avisos" className="mb-1 flex gap-5 border-b border-stroke-3">
        <Tab active={filtro === "todos"} onClick={() => setFiltro("todos")} count={avisos.length}>
          Todos
        </Tab>
        <Tab active={filtro === "vigentes"} onClick={() => setFiltro("vigentes")} count={vigentes.length}>
          Vigentes
        </Tab>
      </div>

      <div role="tabpanel" aria-label={filtro === "todos" ? "Todos los avisos" : "Avisos vigentes"}>
        {comunicados === null ? (
          <div className="pt-4">
            <LoadError what="los avisos" />
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-body text-fg-2">{filtro === "vigentes" ? "No hay avisos vigentes." : "Todavía no hay avisos."}</p>
            {filtro === "vigentes" && avisos.length > 0 && (
              <button type="button" onClick={() => setFiltro("todos")} className={buttonClass("outline", "sm", "mt-3")}>
                Ver todos los avisos
              </button>
            )}
          </div>
        ) : (
          <div className="-mx-4 sm:-mx-6">
            {grupos.map((grupo) => (
              <section key={grupo.dia} aria-labelledby={`dia-${grupo.dia}`} className="relative">
                {/* La línea del separador se queda; la píldora con la fecha se fija arriba. */}
                <div aria-hidden className="absolute inset-x-4 top-[23px] border-t border-stroke-2 sm:inset-x-6" />
                <h2 id={`dia-${grupo.dia}`} className="sticky top-[52px] z-10 flex justify-center py-2.5 lg:top-[49px]">
                  <span className="rounded-full bg-surface px-3 py-1 text-[13px] leading-[18px] font-semibold text-fg shadow-float" suppressHydrationWarning>
                    {grupo.label}
                  </span>
                </h2>
                <ul>
                  {grupo.avisos.map((aviso) => (
                    <li key={aviso.id}>
                      <Mensaje
                        aviso={aviso}
                        nuevo={visita !== undefined && esAvisoNuevo(aviso.fecha, visita.visto, ahora.getTime())}
                        timeZone={timeZone}
                        onImage={setImagen}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {comunicados !== null && filtro === "todos" && <InicioDelCanal />}
      <ImageViewer image={imagen} onClose={() => setImagen(null)} />
    </div>
  );
}

function Tab({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex h-10 items-center gap-1.5 text-body font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        active ? "text-fg" : "text-fg-3 hover:text-fg"
      }`}
    >
      {children}
      <span className="text-caption font-medium text-fg-3 tabular-nums">{count}</span>
      {active && <motion.span layoutId="avisos-tab" aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" transition={SPRING.indicator} />}
    </button>
  );
}

function Mensaje({
  aviso,
  nuevo,
  timeZone,
  onImage,
}: {
  aviso: Aviso;
  nuevo: boolean;
  timeZone?: string;
  onImage: (image: ViewerImage) => void;
}) {
  const vigencia = formatLongDate(aviso.vigencia, timeZone);
  const vencido = isPastCalendarDay(aviso.vigencia, timeZone);
  return (
    <article aria-labelledby={`aviso-${aviso.id}`} className={`flex gap-2 px-4 py-2 sm:px-6 ${nuevo ? "bg-highlight" : "hover:bg-surface-2"}`}>
      <AdminAvatar />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body font-bold text-fg">Administración</span>
          {vigencia && (
            <span className={`text-caption ${vencido ? "text-fg-3" : "font-medium text-success"}`} suppressHydrationWarning>
              {vencido ? `Terminó el ${vigencia}` : `Vigente hasta el ${vigencia}`}
            </span>
          )}
          {nuevo && <span className="text-caption font-bold text-mention">Nuevo</span>}
        </p>
        <h3 id={`aviso-${aviso.id}`} className="text-message font-semibold text-fg">
          {aviso.titulo}
        </h3>
        {aviso.mensaje && <p className="text-message whitespace-pre-line text-fg">{aviso.mensaje}</p>}
        {(aviso.imagen || aviso.pdf) && (
          <div className="mt-2 flex flex-col items-start gap-2">
            {aviso.imagen && (
              <AvisoImagen src={aviso.imagen} titulo={aviso.titulo} onOpen={() => onImage({ src: aviso.imagen ?? "", title: aviso.titulo })} />
            )}
            {aviso.pdf && <AvisoPdf href={aviso.pdf} />}
          </div>
        )}
      </div>
    </article>
  );
}

/** Al final de la historia, como el inicio de un canal en Slack. */
function InicioDelCanal() {
  return (
    <div className="mt-6 flex items-start gap-3 border-t border-stroke-3 pt-6">
      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[11px] bg-highlight">
        <Image src="/logo-mono.png" alt="" width={35} height={36} className="h-9 w-auto" />
      </span>
      <div>
        <p className="text-body-lg font-bold text-fg">Aquí empieza el canal de avisos</p>
        <p className="text-body text-fg-3">La administración de Val&apos;Quirico publica aquí comunicados, eventos y convocatorias.</p>
      </div>
    </div>
  );
}
