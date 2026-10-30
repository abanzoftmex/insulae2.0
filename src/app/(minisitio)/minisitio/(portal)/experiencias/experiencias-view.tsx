"use client";

/**
 * Experiencias Val'Quirico (antes pages/experiencias.js): carrusel con los comunicados
 * destacados (con imagen o PDF). Los datos llegan cargados desde page.tsx.
 */
import { useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Bell, Image as ImageIcon, Star, FileText, Clock } from "lucide-react";
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Experiencias Val'Quirico</h3>
                  <p className="text-white/80 text-sm">
                    Últimas actualizaciones importantes
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Experiencias Val'Quirico</h3>
                <p className="text-white/80 text-sm">
                  Últimas actualizaciones importantes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {expiredCount > 0 && (
                <button
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  className="px-4 py-2 bg-white/90 hover:bg-white text-[#cba258] rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
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
                  className="px-4 py-2 bg-white text-[#cba258] rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Gaceta
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {experiencias.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay experiencias vigentes
              </h3>
              <p className="text-gray-600 mb-4">
                No hay experiencias activas en este momento. Te notificaremos
                cuando haya nuevas actualizaciones.
              </p>
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
                      <div
                        className={`group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 h-full ${experiencia.isEmpty ? "" : "cursor-pointer"
                          } ${expired ? 'watermark-expired opacity-75' : ''}`}
                      >
                        {experiencia.isEmpty ? (
                          // Slide vacío con diseño placeholder
                          <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200">
                            <div className="text-center">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Bell className="text-gray-400 w-6 h-6" />
                              </div>
                              <p className="text-gray-400 font-medium text-sm">
                                Sin experiencias adicionales
                              </p>
                              <p className="text-gray-300 text-xs mt-1">
                                Próximamente más contenido
                              </p>
                            </div>
                          </div>
                        ) : experiencia.imagen ? (
                          <div className="w-full bg-gray-50 flex items-center justify-center min-h-[250px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={experiencia.imagen}
                              alt={experiencia.titulo}
                              className={`max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 ${expired ? 'grayscale blur-[0.5px]' : ''}`}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNSAxMEwxMCAxMEw4IDhMMTEgMTJMMTEgMTVMMTEuNSA5TDIyIDI0SDE3TDE1IDIwTDE1IDEweiIgc3Ryb2tlPSIjOUI5QkE0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K";
                                e.currentTarget.classList.add("opacity-50");
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center min-h-[250px]">
                            <div className="text-center">
                              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ImageIcon className="text-gray-500 w-6 h-6" />
                              </div>
                              <p className="text-gray-500 font-medium text-sm">
                                Próximamente
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Overlay - solo para imágenes reales y slides no vacíos */}
                        {!experiencia.isEmpty && experiencia.imagen && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-0 left-0 right-0 text-white p-4">
                              <h4 className="font-bold mb-1 text-lg">
                                {experiencia.titulo}
                              </h4>
                              <p className="text-white/90 mb-2 text-sm line-clamp-2">
                                {experiencia.descripcion}
                              </p>
                              <div className="flex items-center text-white/80">
                                <Star className="mr-1 w-3 h-3" />
                                <span className="text-xs">
                                  {experiencia.categoria}
                                </span>
                                {expired && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-xs">Expirado</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
