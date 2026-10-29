"use client";

/** Comunicados (antes pages/comunicados.js). Los comunicados llegan cargados desde page.tsx. */
import { useState } from 'react';
import { useRequireAuth } from '@/components/minisitio/use-minisitio-auth';
import type { Comunicado } from '@/modules/minisitio/infrastructure/queries/communications.queries';
import { Bell, Users, Building, FileText, Image as ImageIcon, Calendar, Filter, CheckCircle, Clock, X } from 'lucide-react';
import { isPastCalendarDay, useDisplayTimeZone } from '../_lib/client-dates';
import { comunicadoFileUrl } from '../_lib/comunicado-file-url';

type Filtro = 'todos' | 'propietarios' | 'comercios' | 'propietarios-comercios';

export function ComunicadosView({ comunicados }: { comunicados: Comunicado[] }) {
  const { userType } = useRequireAuth();
  const [filtro, setFiltro] = useState<Filtro>('todos'); // 'todos', 'propietarios', 'comercios', 'propietarios-comercios'
  const [modalImage, setModalImage] = useState<string | null>(null);
  const timeZone = useDisplayTimeZone();

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

  return (
    <div className="min-h-screen bg-canvas p-6">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-r from-[#cba258] to-[#cba258] rounded-2xl flex items-center justify-center shadow-lg">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 ">Comunicados</h1>
              <p className="text-gray-600">Mantente informado sobre las últimas noticias y actualizaciones</p>
            </div>
          </div>


        </div>
      </div>

      {/* Filtros Modernos */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Filter className="w-5 h-5 text-[#cba258]" />
            <h3 className="text-lg font-semibold text-gray-900">Filtrar Comunicados</h3>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFiltro('todos')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${filtro === 'todos'
                ? 'bg-gradient-to-r from-[#cba258] to-[#cba258] text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
            >
              <Bell className="w-4 h-4" />
              <span>Todos ({comunicados.length})</span>
            </button>

            {(userType === 'propietario' || userType === 'both') && (
              <button
                onClick={() => setFiltro('propietarios')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${filtro === 'propietarios'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-md'
                  }`}
              >
                <Users className="w-4 h-4" />
                <span>Propietarios ({comunicados.filter(c => c.tipo_fijo === 1).length})</span>
              </button>
            )}

            {(userType === 'arrendatario' || userType === 'both') && (
              <button
                onClick={() => setFiltro('comercios')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${filtro === 'comercios'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-md'
                  }`}
              >
                <Building className="w-4 h-4" />
                <span>Comercios ({comunicados.filter(c => c.tipo_fijo === 2).length})</span>
              </button>
            )}

            {(userType === 'both') && (
              <button
                onClick={() => setFiltro('propietarios-comercios')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${filtro === 'propietarios-comercios'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 hover:shadow-md'
                  }`}
              >
                <Building className="w-4 h-4" />
                <span>Propietarios y Comercios ({comunicados.filter(c => c.tipo_fijo === 3).length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Comunicados Moderna */}
      <div className="space-y-6">
        {comunicadosFiltrados.length > 0 ? (
          comunicadosFiltrados.map((comunicado, index) => {
            const vencido = isVencido(comunicado.fechaVigencia);

            return (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group ${vencido ? 'grayscale opacity-75 watermark-expired' : ''
                  }`}
              >
                {/* Header del Comunicado */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col items-start gap-8">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${comunicado.tipo_fijo === 1
                        ? 'bg-blue-100 text-blue-600'
                        : comunicado.tipo_fijo === 2
                          ? 'bg-green-100 text-green-600'
                          : 'bg-purple-100 text-purple-600'
                        }`}>
                        {comunicado.tipo_fijo === 1 ? <Users className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#cba258] transition-colors duration-200">
                          {comunicado.nombre}
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${comunicado.tipo_fijo === 1
                          ? 'bg-blue-100 text-blue-800'
                          : comunicado.tipo_fijo === 2
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                          }`}>
                          {comunicado.tipo_fijo === 1
                            ? 'Dirigido a: Propietarios'
                            : comunicado.tipo_fijo === 2
                              ? 'Dirigido a: Comercios'
                              : 'Dirigido a: Propietarios y Comercios'}
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Publicado: <strong className="font-bold">{formatFecha(comunicado.fechaPublicar)}</strong></span>
                          </span>
                          {comunicado.fechaVigencia && (
                            <span className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Vigente hasta: <strong className="font-bold">{formatFecha(comunicado.fechaVigencia)}</strong></span>
                            </span>
                          )}
                          {vencido && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500 text-white filter-none">
                              <Clock className="w-3 h-3 mr-1" />
                              Vencido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {comunicado.pdf && (
                        <a
                          href={comunicadoFileUrl(comunicado.pdf)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 group/btn"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          <span className="font-medium">Ver PDF</span>
                        </a>
                      )}

                      {comunicado.imagen && (
                        <button
                          onClick={() => setModalImage(comunicadoFileUrl(comunicado.imagen ?? ""))}
                          className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 group/btn"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          <span className="font-medium">Ver Imagen</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenido del Comunicado */}
                <div className="px-6 py-6">
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {comunicado.descripcion}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      {vencido ? (
                        <div className="flex items-center space-x-2 text-red-500 filter-none">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Vencido</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-green-500">
                          <CheckCircle className="w-4 h-4" />
                          <span>Publicado</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
              <Bell className="w-12 h-12 text-gray-400" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {filtro === 'todos' ? 'No hay comunicados' : 'Sin comunicados en esta categoría'}
            </h3>

            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filtro === 'todos'
                ? 'Aún no se han publicado comunicados. Te notificaremos cuando haya nuevas actualizaciones.'
                : `No hay comunicados disponibles para ${filtro === 'propietarios' ? 'propietarios' :
                  filtro === 'comercios' ? 'comercios' :
                    'propietarios y comercios'
                } en este momento.`
              }
            </p>

            {filtro !== 'todos' && (
              <button
                onClick={() => setFiltro('todos')}
                className="bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2 transition-all duration-200 hover:shadow-lg"
              >
                <span>Ver todos los comunicados</span>
                <Bell className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Imagen */}
      {
        modalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => setModalImage(null)}
          >
            <div className="relative max-w-7xl max-h-[90vh] w-full">
              <button
                onClick={() => setModalImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors duration-200"
              >
                <X className="w-8 h-8" />
              </button>
              <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={modalImage}
                  alt="Comunicado"
                  className="w-full h-auto max-h-[85vh] object-contain"
                />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
