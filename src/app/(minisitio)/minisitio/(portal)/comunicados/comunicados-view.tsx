"use client";

/** Comunicados (antes pages/comunicados.js). Los comunicados llegan cargados desde page.tsx. */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRequireAuth } from '@/components/minisitio/use-minisitio-auth';
import type { Comunicado } from '@/modules/minisitio/infrastructure/queries/communications.queries';
import { Bell, Users, Building, FileText, Image as ImageIcon, Calendar, Filter, CheckCircle, Clock, X, Share2 } from 'lucide-react';
import { Tooltip } from '@/components/minisitio/tooltip';
import { Toast } from '@/components/minisitio/ui/modal';
import { BUTTON, EmptyState } from '@/components/minisitio/ui/list-controls';
import { msPath } from '@/components/minisitio/paths';
import { isPastCalendarDay, useDisplayTimeZone } from '../_lib/client-dates';
import { comunicadoFileUrl } from '../_lib/comunicado-file-url';

type Filtro = 'todos' | 'propietarios' | 'comercios' | 'propietarios-comercios';

export function ComunicadosView({ comunicados }: { comunicados: Comunicado[] }) {
  const { userType } = useRequireAuth();
  const [filtro, setFiltro] = useState<Filtro>('todos'); // 'todos', 'propietarios', 'comercios', 'propietarios-comercios'
  const [modalImage, setModalImage] = useState<string | null>(null);
  const timeZone = useDisplayTimeZone();
  const reduce = useReducedMotion();
  const [shared, setShared] = useState('');

  // Visor de imagen: Esc para cerrar y la página de atrás quieta.
  useEffect(() => {
    if (!modalImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalImage(null);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [modalImage]);

  // Compartir: hoja nativa del celular o, si no hay, el enlace directo al portapapeles. El enlace
  // abre Comunicados con la tarjeta enmarcada (?id=, ver search-hit.tsx). Antes el botón no hacía nada.
  const compartir = async (comunicado: Comunicado) => {
    const url = `${window.location.origin}${msPath(`/comunicados?id=${encodeURIComponent(comunicado.id_notificaciones)}`)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: comunicado.nombre, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared('Enlace del comunicado copiado.');
      setTimeout(() => setShared(''), 3000);
    } catch (error) {
      // El condómino canceló la hoja de compartir: no es un error.
      if ((error as DOMException)?.name !== 'AbortError') setShared('No se pudo copiar el enlace.');
    }
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "";
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return "";
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      return localDate.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "";
    }
  };

  // Vencido si el día de la vigencia es anterior a hoy (ver _lib/client-dates).
  const isVencido = (fechaVigencia: string | null) => isPastCalendarDay(fechaVigencia, timeZone);

  const comunicadosFiltrados = comunicados
    .filter(comunicado => {
      if (filtro === 'todos') return true;
      if (filtro === 'propietarios') return comunicado.tipo_fijo === 1;
      if (filtro === 'comercios') return comunicado.tipo_fijo === 2;
      if (filtro === 'propietarios-comercios') return comunicado.tipo_fijo === 3;
      return true;
    })
    .sort((a, b) => {
      // Primero ordenar por estado activo/vencido
      const aVencido = isVencido(a.fechaVigencia);
      const bVencido = isVencido(b.fechaVigencia);

      // Los activos (no vencidos) van primero
      if (aVencido !== bVencido) {
        return aVencido ? 1 : -1;
      }

      // Dentro del mismo estado, ordenar por fecha de publicación (más recientes primero)
      return new Date(b.fechaPublicar ?? 0).getTime() - new Date(a.fechaPublicar ?? 0).getTime();
    });

  const filtros: { key: Filtro; label: string; icon: typeof Bell; count: number; show: boolean }[] = [
    { key: 'todos', label: 'Todos', icon: Bell, count: comunicados.length, show: true },
    {
      key: 'propietarios',
      label: 'Propietarios',
      icon: Users,
      count: comunicados.filter((c) => c.tipo_fijo === 1).length,
      show: userType === 'propietario' || userType === 'both',
    },
    {
      key: 'comercios',
      label: 'Comercios',
      icon: Building,
      count: comunicados.filter((c) => c.tipo_fijo === 2).length,
      show: userType === 'arrendatario' || userType === 'both',
    },
    {
      key: 'propietarios-comercios',
      label: 'Propietarios y Comercios',
      icon: Building,
      count: comunicados.filter((c) => c.tipo_fijo === 3).length,
      show: userType === 'both',
    },
  ];

  const dirigidoA = (tipo: number) =>
    tipo === 1 ? 'Dirigido a: Propietarios' : tipo === 2 ? 'Dirigido a: Comercios' : 'Dirigido a: Propietarios y Comercios';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-mint shadow-[0_1px_2px_rgb(61_60_34/0.25)]">
          <Bell aria-hidden className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[24px] font-bold leading-8 tracking-[-0.02em] text-fg">Comunicados</h2>
          <p className="text-[14px] leading-5 text-fg-3">Mantente informado sobre las últimas noticias y actualizaciones</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-stroke-2 bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Filter aria-hidden className="h-4 w-4 text-brand" strokeWidth={2} />
          <h3 className="text-[14px] font-semibold text-fg">Filtrar Comunicados</h3>
        </div>
        <div role="group" aria-label="Filtrar por público" className="flex flex-wrap gap-2">
          {filtros
            .filter((f) => f.show)
            .map(({ key, label, icon: Icon, count }) => {
              const active = filtro === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFiltro(key)}
                  className={`relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 ${
                    active ? 'text-white' : 'bg-surface-3 text-fg-2 hover:bg-surface-4 hover:text-fg'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="comunicados-filtro"
                      aria-hidden
                      className="absolute inset-0 bg-brand"
                      style={{ borderRadius: 9999 }}
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 }}
                    />
                  )}
                  <Icon aria-hidden className="relative h-4 w-4" strokeWidth={2} />
                  <span className="relative">{label}</span>
                  <span
                    className={`relative rounded-full px-1.5 text-[12px] font-semibold tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-card text-fg-3'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Lista de comunicados */}
      {comunicadosFiltrados.length > 0 ? (
        <ul className="space-y-4">
          {comunicadosFiltrados.map((comunicado, index) => {
            const vencido = isVencido(comunicado.fechaVigencia);
            const mostrarDescripcion = comunicado.descripcion && comunicado.descripcion.trim() !== comunicado.nombre.trim();
            return (
              <li
                key={comunicado.id_notificaciones ?? index}
                data-search-id={comunicado.id_notificaciones}
                className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-200 ease-out hover:shadow-[0_10px_28px_-14px_rgb(61_60_34/0.28)] ${
                  vencido ? 'border-stroke-3' : 'border-stroke-2 hover:border-brand/25'
                }`}
              >
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      vencido ? 'bg-surface-3 text-fg-4' : 'bg-brand/[0.08] text-brand'
                    }`}
                  >
                    {comunicado.tipo_fijo === 1 ? (
                      <Users aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                    ) : (
                      <Building aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className={`text-[18px] font-semibold leading-6 tracking-[-0.01em] ${vencido ? 'text-fg-2' : 'text-fg'}`}>
                      {comunicado.nombre}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-fg-3">
                      <span className="inline-flex h-6 items-center rounded-full bg-surface-4 px-2.5 text-[12px] font-medium text-fg-2">
                        {dirigidoA(comunicado.tipo_fijo)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                        Publicado: <strong className="font-semibold text-fg-2">{formatFecha(comunicado.fechaPublicar)}</strong>
                      </span>
                      {comunicado.fechaVigencia && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                          Vigente hasta: <strong className="font-semibold text-fg-2">{formatFecha(comunicado.fechaVigencia)}</strong>
                        </span>
                      )}
                      {vencido && (
                        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-critical-bg px-2.5 text-[12px] font-medium text-overdue ring-1 ring-inset ring-overdue/15">
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-overdue" />
                          Vencido
                        </span>
                      )}
                    </div>

                    {mostrarDescripcion && (
                      <p className="mt-4 whitespace-pre-line text-[15px] leading-6 text-fg-2">{comunicado.descripcion}</p>
                    )}

                    {(comunicado.pdf || comunicado.imagen) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {comunicado.pdf && (
                          <a href={comunicadoFileUrl(comunicado.pdf)} target="_blank" rel="noopener noreferrer" className={BUTTON.secondary}>
                            <FileText aria-hidden className="h-4 w-4 text-overdue" strokeWidth={2} />
                            Ver PDF
                          </a>
                        )}
                        {comunicado.imagen && (
                          <button
                            type="button"
                            onClick={() => setModalImage(comunicadoFileUrl(comunicado.imagen ?? ''))}
                            className={BUTTON.secondary}
                          >
                            <ImageIcon aria-hidden className="h-4 w-4 text-brand" strokeWidth={2} />
                            Ver Imagen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stroke-3 bg-surface-2 px-5 py-2.5 sm:px-6">
                  {vencido ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-3">
                      <Clock aria-hidden className="h-4 w-4" strokeWidth={2} />
                      Vencido
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
                      <CheckCircle aria-hidden className="h-4 w-4" strokeWidth={2} />
                      Publicado
                    </span>
                  )}
                  <Tooltip title="Compartir" position="bottom" className="inline-flex">
                    <button
                      type="button"
                      onClick={() => void compartir(comunicado)}
                      aria-label={`Compartir «${comunicado.nombre}»`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 outline-none transition-colors duration-100 hover:bg-surface-4 hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45"
                    >
                      <Share2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </Tooltip>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title={filtro === 'todos' ? 'No hay comunicados' : 'Sin comunicados en esta categoría'}
          description={
            filtro === 'todos'
              ? 'Aún no se han publicado comunicados. Te notificaremos cuando haya nuevas actualizaciones.'
              : `No hay comunicados disponibles para ${
                  filtro === 'propietarios' ? 'propietarios' : filtro === 'comercios' ? 'comercios' : 'propietarios y comercios'
                } en este momento.`
          }
          action={
            filtro !== 'todos' ? (
              <button type="button" onClick={() => setFiltro('todos')} className={BUTTON.primary}>
                <Bell aria-hidden className="h-4 w-4" strokeWidth={2} />
                Ver todos los comunicados
              </button>
            ) : undefined
          }
        />
      )}

      <Toast message={shared} tone={shared.startsWith('No') ? 'error' : 'success'} onClose={() => setShared('')} />

      {/* Visor de imagen */}
      {modalImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagen del comunicado"
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setModalImage(null)}
        >
          <button
            type="button"
            onClick={() => setModalImage(null)}
            aria-label="Cerrar imagen"
            autoFocus
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white outline-none backdrop-blur-sm transition-colors duration-150 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={modalImage}
            alt="Comunicado"
            onClick={(e) => e.stopPropagation()}
            className="animate-rise-in max-h-[88vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
