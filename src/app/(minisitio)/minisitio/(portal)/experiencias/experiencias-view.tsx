"use client";

/**
 * Experiencias: los carteles de eventos y actividades (avisos con imagen o PDF) en una galería,
 * próximas o anteriores. Antes era un carrusel con reproducción automática que se rellenaba con
 * tarjetas vacías hasta tener tres; ahora se ve lo que hay y, si no hay próximas, se dice.
 */
import { useMemo, useState } from "react";
import { ArrowUpRight, FileText } from "lucide-react";
import type { ComunicadoDestacado } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { ImageViewer, type ViewerImage } from "@/components/minisitio/ui/image-viewer";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { UnderlineTabs } from "@/components/minisitio/ui/tabs";
import { isPastCalendarDay, useDisplayTimeZone } from "../_lib/client-dates";
import { comunicadoFileUrl } from "../_lib/comunicado-file-url";
import { formatLongDate } from "../_lib/format";

interface Experiencia {
  id: string;
  titulo: string;
  descripcion: string;
  vigencia: string | null;
  publicado: string | null;
  imagen: string | null;
  pdf: string | null;
}

type Filtro = "proximas" | "anteriores";

export function ExperienciasView({ destacados, linkGaceta }: { destacados: ComunicadoDestacado[] | null; linkGaceta: string | null }) {
  const timeZone = useDisplayTimeZone();
  const experiencias = useMemo<Experiencia[]>(
    () =>
      (destacados ?? []).map((c) => {
        const titulo = c.nombre?.trim() || "Experiencia";
        const descripcion = c.descripcion?.trim() ?? "";
        return {
          id: c.id_notificaciones,
          titulo,
          descripcion: descripcion && descripcion !== titulo ? descripcion : "",
          vigencia: c.fechaVigencia,
          publicado: c.fechaPublicar,
          imagen: c.imagen ? comunicadoFileUrl(c.imagen) : null,
          pdf: c.pdf ? comunicadoFileUrl(c.pdf) : null,
        };
      }),
    [destacados],
  );
  const proximas = experiencias.filter((e) => !isPastCalendarDay(e.vigencia, timeZone));
  const anteriores = experiencias.filter((e) => isPastCalendarDay(e.vigencia, timeZone));
  const [filtro, setFiltro] = useState<Filtro>(proximas.length > 0 ? "proximas" : "anteriores");
  const [imagen, setImagen] = useState<ViewerImage | null>(null);
  const visibles = filtro === "proximas" ? proximas : anteriores;

  if (destacados === null) {
    return (
      <div className="mx-auto w-full max-w-[1040px]">
        <LoadError what="las experiencias" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 border-b border-stroke-3">
        <UnderlineTabs
          label="Mostrar experiencias"
          value={filtro}
          onChange={setFiltro}
          layoutId="experiencias-tab"
          options={[
            { id: "proximas", label: "Próximas", count: proximas.length },
            { id: "anteriores", label: "Anteriores", count: anteriores.length },
          ]}
        />
        {linkGaceta && (
          <a href={linkGaceta} target="_blank" rel="noopener noreferrer" className="mb-2 inline-flex items-center gap-1 text-body font-medium text-brand hover:underline">
            Gaceta Val&apos;Quirico
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        )}
      </div>

      {filtro === "anteriores" && proximas.length === 0 && experiencias.length > 0 && (
        <p className="mb-4 text-body text-fg-3">No hay experiencias próximas por ahora; estas son las anteriores.</p>
      )}

      <div role="tabpanel" aria-label={filtro === "proximas" ? "Experiencias próximas" : "Experiencias anteriores"}>
        {visibles.length === 0 ? (
          <p className="py-12 text-center text-body text-fg-2">{experiencias.length === 0 ? "Todavía no hay experiencias publicadas." : "No hay experiencias próximas por ahora."}</p>
        ) : (
          <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((e) => {
              const vigencia = formatLongDate(e.vigencia, timeZone);
              const pasada = isPastCalendarDay(e.vigencia, timeZone);
              return (
                <li key={e.id} className="min-w-0">
                  <article aria-labelledby={`exp-${e.id}`}>
                    {e.imagen ? (
                      <button
                        type="button"
                        onClick={() => setImagen({ src: e.imagen ?? "", title: e.titulo })}
                        className="group block aspect-[4/5] w-full overflow-hidden rounded-panel border border-stroke-2 bg-surface-3 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- imágenes de la 1.0 en otro host */}
                        <img src={e.imagen} alt={`Cartel de «${e.titulo}»`} loading="lazy" className="h-full w-full object-cover transition-transform duration-moderate group-hover:scale-[1.02]" />
                        <span className="sr-only"> (ampliar)</span>
                      </button>
                    ) : e.pdf ? (
                      // Sin cartel: la tarjeta abre el PDF.
                      <a
                        href={e.pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-panel border border-stroke-2 bg-surface-2 text-fg-3 outline-none hover:bg-surface-3 hover:text-fg-2 focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <FileText className="h-8 w-8" aria-hidden />
                        <span className="text-body font-medium">Abrir el PDF</span>
                        <span className="sr-only"> de «{e.titulo}» (se abre en otra pestaña)</span>
                      </a>
                    ) : (
                      <div aria-hidden className="flex aspect-[4/5] w-full items-center justify-center rounded-panel border border-stroke-2 bg-surface-2 text-fg-4">
                        <FileText className="h-8 w-8" />
                      </div>
                    )}
                    <h2 id={`exp-${e.id}`} className="mt-3 text-message font-semibold text-fg">
                      {e.titulo}
                    </h2>
                    {vigencia && (
                      <p className={`text-caption ${pasada ? "text-fg-3" : "font-medium text-success"}`} suppressHydrationWarning>
                        {pasada ? `Terminó el ${vigencia}` : `Hasta el ${vigencia}`}
                      </p>
                    )}
                    {e.descripcion && <p className="mt-1 line-clamp-3 text-body text-fg-2">{e.descripcion}</p>}
                    {e.pdf && (
                      <a href={e.pdf} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-body font-medium text-brand hover:underline">
                        Ver PDF
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only"> (se abre en otra pestaña)</span>
                      </a>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ImageViewer image={imagen} onClose={() => setImagen(null)} />
    </div>
  );
}
