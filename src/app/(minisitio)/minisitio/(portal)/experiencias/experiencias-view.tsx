"use client";

/**
 * Experiencias Val'Quirico (antes pages/experiencias.js): carrusel con los comunicados
 * destacados (con imagen o PDF). Los datos llegan cargados desde page.tsx.
 */
import { useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Bell, Image as ImageIcon, Star, FileText, Clock, Sparkles } from "lucide-react";
import type { ComunicadoDestacado } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { isPastCalendarDay, useDisplayTimeZone } from "../_lib/client-dates";
import { comunicadoFileUrl } from "../_lib/comunicado-file-url";

interface ExperienciaSlide {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string | null;
  fechaVigencia?: string | null;
  categoria: string;
  imagen: string | null;
  pdf: string | null;
  isEmpty?: boolean;
}

// Formatear los comunicados para el componente
// Mantener el orden que viene del API (fecha de vigencia más próxima primero)
function formatExperiencias(comunicados: ComunicadoDestacado[]): ExperienciaSlide[] {
  return comunicados.map((comunicado) => {
    const categoriaId = comunicado.id_dcat_categorias_notificaciones as number | null;
    return {
      id: comunicado.id_notificaciones,
      titulo: comunicado.nombre,
      descripcion: comunicado.descripcion,
      fecha: comunicado.fechaPublicar,
      fechaVigencia: comunicado.fechaVigencia,
      categoria:
        categoriaId === 1
          ? "Propietarios"
          : categoriaId === 2
            ? "Comercios"
            : "Todos",
      imagen: comunicado.imagen ? comunicadoFileUrl(comunicado.imagen) : null,
      pdf: comunicado.pdf ? comunicadoFileUrl(comunicado.pdf) : null,
    };
  });
}

function ExperienciaCard({ href, className, children }: { href: string | null; className: string; children: React.ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function ExperienciasView({
  destacados,
  linkGaceta,
  error,
}: {
  destacados: ComunicadoDestacado[];
  linkGaceta: string | null;
  /** Mensaje de error si los comunicados destacados no se pudieron cargar. */
  error: string | null;
}) {
  const [experiencias] = useState(() => formatExperiencias(destacados));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const timeZone = useDisplayTimeZone();

  // Función para verificar si está expirado (día de la vigencia anterior a hoy; ver _lib/client-dates)
  const isExpired = (fechaVigencia?: string | null) => isPastCalendarDay(fechaVigencia, timeZone);

  // Preparar slides para el carousel - siempre 3 slides
  const prepareSlides = (experiencias: ExperienciaSlide[], filterExpired = false) => {
    // Filtrar experiencias expiradas si filterExpired es true
    let filteredExperiencias = experiencias;
    if (filterExpired) {
      filteredExperiencias = experiencias.filter(exp => !isExpired(exp.fechaVigencia));
    }

    const slides = [...filteredExperiencias];

    // Si hay menos de 3 experiencias, rellenar con slides vacíos
    while (slides.length < 3) {
      slides.push({
        id: `empty-${slides.length}`,
        titulo: "",
        descripcion: "",
        fecha: "",
        categoria: "",
        imagen: null,
        pdf: null,
        isEmpty: true,
      });
    }

    return slides;
  };

  // Configurar Embla Carousel
  const autoplayOptions = {
    delay: 4000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
    playOnInit: true,
  };

  // Preparar slides (siempre 3) - filtrar expirados si showPastEvents es false
  const slides = prepareSlides(experiencias, !showPastEvents);

  // Contar experiencias expiradas
  const expiredCount = experiencias.filter(exp => isExpired(exp.fechaVigencia)).length;

  // Usar autoplay solo si hay más de 3 experiencias reales
  const emblaOptions: Parameters<typeof useEmblaCarousel>[0] = {
    loop: false, // Deshabilitamos el loop para que siempre se vean los 3
    align: "start",
    skipSnaps: false,
    dragFree: false,
    containScroll: "trimSnaps", // Evita slides parciales
  };

  const emblaPlugins =
    experiencias.length > 3 ? [Autoplay(autoplayOptions)] : [];
  const [emblaRef] = useEmblaCarousel(emblaOptions, emblaPlugins);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
          <div className="bg-warning px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <Sparkles aria-hidden className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold leading-6 text-white">Experiencias Val'Quirico</h3>
                  <p className="text-[13px] text-white/80">
                    Últimas actualizaciones importantes
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-6 my-6 rounded-xl bg-critical-bg px-4 py-3" role="alert">
            <p className="text-[13.5px] text-overdue">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
        <div className="bg-warning px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Sparkles aria-hidden className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-[18px] font-semibold leading-6 text-white">Experiencias Val'Quirico</h3>
                <p className="text-[13px] text-white/80">
                  Últimas actualizaciones importantes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {expiredCount > 0 && (
                <button
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  type="button"
                  aria-pressed={showPastEvents}
                  className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3.5 text-[13.5px] font-semibold text-warning outline-none transition-colors duration-150 hover:bg-gold-soft focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-warning"
                >
                  <Clock className="w-4 h-4" />
                  {showPastEvents ? 'Ocultar eventos pasados' : `Ver eventos pasados (${expiredCount})`}
                </button>
              )}
              {linkGaceta && (
                <a
                  href={linkGaceta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3.5 text-[13.5px] font-semibold text-warning outline-none transition-colors duration-150 hover:bg-gold-soft focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <FileText aria-hidden className="h-4 w-4" />
                  Ver Gaceta
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Sin vigentes (y sin mostrar las pasadas) es un estado vacío claro: antes salían tres
              cajas punteadas "Sin experiencias adicionales" aunque hubiera nueve eventos pasados. */}
          {slides.every((s) => s.isEmpty) ? (
            <div className="py-12 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-soft text-warning ring-1 ring-inset ring-brand-accent/20">
                <Sparkles aria-hidden className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <h3 className="mb-1.5 text-[16px] font-semibold text-fg">No hay experiencias vigentes</h3>
              <p className="mx-auto mb-5 max-w-md text-[13.5px] leading-5 text-fg-3">
                No hay experiencias activas en este momento. Te notificaremos
                cuando haya nuevas actualizaciones.
              </p>
              {expiredCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPastEvents(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-stroke-2 bg-card px-4 text-[13.5px] font-semibold text-fg-2 outline-none transition-[background-color,border-color] duration-150 hover:border-stroke hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2"
                >
                  <Clock aria-hidden className="h-4 w-4" strokeWidth={2} />
                  Ver eventos pasados ({expiredCount})
                </button>
              )}
            </div>
          ) : (
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex py-2">
                {slides.map((experiencia) => {
                  const expired = !experiencia.isEmpty && isExpired(experiencia.fechaVigencia);
                  return (
                    <div
                      key={experiencia.id}
                      className="embla__slide pl-4 first:pl-0"
                    >
                      {/* La tarjeta abre el PDF o la imagen (antes tenía cursor de enlace pero no hacía nada). */}
                      <ExperienciaCard
                        href={experiencia.isEmpty ? null : experiencia.pdf || experiencia.imagen}
                        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-stroke-2 bg-card outline-none transition-[box-shadow,border-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-brand/45 ${
                          experiencia.isEmpty ? "" : "hover:border-stroke hover:shadow-[0_10px_28px_-14px_rgb(61_60_34/0.28)]"
                        }`}
                      >
                        {experiencia.isEmpty ? (
                          // Slide vacío con diseño placeholder
                          <div className="flex aspect-[4/5] w-full items-center justify-center bg-surface-2">
                            <div className="text-center">
                              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-4">
                                <Bell aria-hidden className="h-6 w-6 text-fg-4" strokeWidth={1.5} />
                              </div>
                              <p className="text-[13.5px] font-medium text-fg-3">
                                Sin experiencias adicionales
                              </p>
                              <p className="mt-1 text-[12px] text-fg-4">
                                Próximamente más contenido
                              </p>
                            </div>
                          </div>
                        ) : experiencia.imagen ? (
                          <div className="aspect-[4/5] w-full overflow-hidden bg-surface-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={experiencia.imagen}
                              alt={experiencia.titulo}
                              className={`h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100 ${expired ? 'opacity-70 saturate-50' : ''}`}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNSAxMEwxMCAxMEw4IDhMMTEgMTJMMTEgMTVMMTEuNSA5TDIyIDI0SDE3TDE1IDIwTDE1IDEweiIgc3Ryb2tlPSIjOUI5QkE0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K";
                                e.currentTarget.classList.add("opacity-50");
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/5] w-full items-center justify-center bg-surface-3">
                            <div className="text-center">
                              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-4">
                                <ImageIcon aria-hidden className="h-6 w-6 text-fg-3" strokeWidth={1.5} />
                              </div>
                              <p className="text-[13.5px] font-medium text-fg-3">
                                Próximamente
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Título y datos siempre visibles: antes solo aparecían al pasar el cursor (y nunca en el celular). */}
                        {!experiencia.isEmpty && (
                          <div className="flex flex-1 flex-col gap-1 border-t border-stroke-3 px-4 py-3.5">
                            <h4 className="line-clamp-2 text-[15px] font-semibold leading-5 text-fg">{experiencia.titulo}</h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-3">
                              <span className="inline-flex items-center gap-1">
                                <Star aria-hidden className="h-3.5 w-3.5" />
                                {experiencia.categoria}
                              </span>
                              {expired && (
                                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-critical-bg px-2 text-[12px] font-medium text-overdue ring-1 ring-inset ring-overdue/15">
                                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-overdue" />
                                  Expirado
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </ExperienciaCard>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
