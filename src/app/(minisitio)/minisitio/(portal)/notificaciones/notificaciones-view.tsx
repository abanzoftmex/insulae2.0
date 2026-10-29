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
          border: "border-l-4 border-red-500",
          bg: "bg-red-50",
          text: "text-red-900",
          subtext: "text-red-700",
          date: "text-red-500",
        };
      case "warning":
        return {
          border: "border-l-4 border-yellow-500",
          bg: "bg-yellow-50",
          text: "text-yellow-900",
          subtext: "text-yellow-700",
          date: "text-yellow-500",
        };
      default:
        return {
          border: "border-l-4 border-blue-500",
          bg: "bg-blue-50",
          text: "text-blue-900",
          subtext: "text-blue-700",
          date: "text-blue-500",
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-light bg-opacity-20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-dark" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notificaciones de Hoy</h1>
              <p className="text-sm text-gray-600">
                {notificaciones.length > 0
                  ? `Tienes ${notificaciones.length} notificación${notificaciones.length !== 1 ? 'es' : ''} de hoy ${pagination.total > notificaciones.length ? `de ${pagination.total}` : ''}`
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {notificaciones.length > 0 ? (
        <div className="space-y-4">
          {notificaciones.map((notificacion, index) => {
            const styles = getTipoStyle(notificacion.tipo);
            return (
              <div
                key={notificacion.id || index}
                className={`rounded-lg pl-4 pr-4 py-4 hover:bg-opacity-80 transition-colors ${styles.border} ${styles.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-semibold text-lg ${styles.text}`}>
                        {notificacion.titulo}
                      </h3>
                      {notificacion.tipo === "urgente" && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>

                    <p className={`${styles.subtext} leading-relaxed mb-3`}>
                      {notificacion.mensaje}
                    </p>

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
                            className={`text-xs px-2 py-1 rounded-full ${styles.bg} ${styles.subtext} border`}
                          >
                            {notificacion.categoria}
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
            <div className="text-center pt-6 border-t border-gray-200">
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
              <p className="text-sm text-gray-500 mt-2">
                Mostrando {notificaciones.length} de {pagination.total}{" "}
                notificaciones
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay notificaciones
          </h3>
          <p className="text-gray-600 mb-6">
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
