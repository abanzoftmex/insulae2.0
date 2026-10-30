"use client";

/**
 * Notificaciones (antes pages/notificaciones.js). La primera página (10) llega cargada desde
 * page.tsx; "Actualizar" y "Cargar más" piden las siguientes con listNotificacionesAction.
 */
import { useState } from "react";
import { LoadingSpinner } from "@/components/minisitio/loading-spinner";
import { listNotificacionesAction } from "../../_actions/account";
import type { NotificacionesPage } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { Bell, RefreshCw, ChevronDown } from "lucide-react";
import { useDisplayTimeZone } from "../_lib/client-dates";
import { categoriaComunicado } from "@/components/minisitio/comunicado-categoria";

export function NotificacionesView({ initialData }: { initialData: NotificacionesPage }) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notificaciones, setNotificaciones] = useState(initialData.notificaciones);
  const [pagination, setPagination] = useState(initialData.pagination);
  const timeZone = useDisplayTimeZone();

  const loadNotificaciones = async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const offset = (page - 1) * 10;
      const data = await listNotificacionesAction({ limit: 10, offset });

      if (append) {
        setNotificaciones((prev) => [...prev, ...data.notificaciones]);
      } else {
        setNotificaciones(data.notificaciones);
      }

      setPagination(data.pagination);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      loadNotificaciones(pagination.currentPage + 1, true);
    }
  };

  const formatFecha = (fecha: string | null) => {
    return new Date(fecha ?? 0).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  };

  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case "urgente":
        return {
          border: "border-l-[3px] border-overdue",
          bg: "bg-critical-bg",
          text: "text-overdue",
          subtext: "text-fg-2",
          date: "text-fg-3",
        };
      case "warning":
        return {
          border: "border-l-[3px] border-brand-accent",
          bg: "bg-warning-bg",
          text: "text-fg",
          subtext: "text-fg-2",
          date: "text-fg-3",
        };
      default:
        // Aviso normal: tarjeta neutra con el filo olivo (antes todo era azul).
        return {
          border: "border border-stroke-2 border-l-[3px] border-l-brand",
          bg: "bg-card",
          text: "text-fg",
          subtext: "text-fg-2",
          date: "text-fg-3",
        };
    }
  };

  // Al actualizar con la lista vacía (el minisitio lo envolvía en un <Layout> que nunca
  // importó: esa rama fallaba; aquí el shell ya pinta el layout).
  if (loading && notificaciones.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div >
      {/* Header con botón de actualizar */}
      <div className="rounded-2xl border border-stroke-2 bg-card mb-6">
        <div className="flex items-center justify-between p-6 border-b border-stroke-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-light bg-opacity-20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-dark" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-fg">Notificaciones de Hoy</h2>
              <p className="text-sm text-fg-3">
                {notificaciones.length > 0
                  ? `Tienes ${notificaciones.length} ${notificaciones.length !== 1 ? 'notificaciones' : 'notificación'} de hoy ${pagination.total > notificaciones.length ? `de ${pagination.total}` : ''}`
                  : 'No hay notificaciones nuevas para hoy. Las notificaciones importantes aparecerán aquí.'
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => loadNotificaciones()}
            disabled={loading}
            className="bg-primary-dark text-white px-4 py-2 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke-2 bg-card p-6">
        {notificaciones.length > 0 ? (
        <div className="space-y-4">
          {notificaciones.map((notificacion, index) => {
            const styles = getTipoStyle(notificacion.tipo);
            return (
              <div
                key={notificacion.id || index}
                className={`rounded-xl px-5 py-4 transition-shadow duration-200 hover:shadow-[0_8px_24px_-14px_rgb(61_60_34/0.3)] ${styles.border} ${styles.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-[16px] font-semibold leading-6 ${styles.text}`}>
                        {notificacion.titulo}
                      </h3>
                      {notificacion.tipo === "urgente" && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="w-3 h-3 bg-overdue rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>

                    {/* Si el mensaje repite el título, no se pinta dos veces. */}
                    {notificacion.mensaje && notificacion.mensaje.trim() !== notificacion.titulo?.trim() && (
                      <p className={`${styles.subtext} mb-3 whitespace-pre-line text-[14.5px] leading-6`}>{notificacion.mensaje}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <p
                          className={`text-sm flex items-center ${styles.date}`}
                          suppressHydrationWarning
                        >
                          <Bell className="w-3 h-3 mr-1" />
                          {formatFecha(notificacion.fecha)}
                        </p>
                        {notificacion.categoria && (
                          <span
                            className="inline-flex h-[22px] items-center rounded-full bg-surface-4 px-2 text-[12px] font-medium text-fg-2"
                          >
                            {/* La categoría llega como código ("3"): se muestra el público. */}
                            {categoriaComunicado(String(notificacion.categoria))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Botón Cargar Más */}
          {pagination.hasMore && (
            <div className="text-center pt-6 border-t border-stroke-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Cargar más notificaciones
                  </>
                )}
              </button>
              <p className="text-sm text-fg-3 mt-2">
                Mostrando {notificaciones.length} de {pagination.total}{" "}
                notificaciones
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-fg-4" />
          </div>
          <h3 className="text-lg font-medium text-fg mb-2">
            No hay notificaciones
          </h3>
          <p className="text-fg-3 mb-6">
            No hay notificaciones nuevas para hoy. Las notificaciones importantes aparecerán aquí.
          </p>
          <button
            onClick={() => loadNotificaciones()}
            className="bg-primary-dark text-white px-6 py-2 rounded-lg hover:bg-primary-light hover:text-primary-dark transition-colors duration-200 inline-flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
