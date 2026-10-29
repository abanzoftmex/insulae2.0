"use client";

import { BookOpen, ExternalLink, FileText } from "lucide-react";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { documentUrl } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";

/**
 * Pestaña "Reglamentos" del estado de cuenta del comercio. Los documentos llegan con la carga
 * de la página (antes se pedían al abrir la pestaña); la selección vive en la vista para que
 * se conserve al cambiar de pestaña.
 */
export function ReglamentosTab({
  reglamentos,
  reglamentosError,
  selectedReglamentoId,
  onSelect,
}: {
  reglamentos: Documento[];
  reglamentosError: string;
  selectedReglamentoId: string | null;
  onSelect: (id: string) => void;
}) {
  const selectedReglamento = reglamentos.find((doc) => doc.id_proyectos_documentos === selectedReglamentoId);

  return (
    <div className="space-y-8">
      <div className="bg-white border border-line rounded-none shadow-sm">
        <div className="bg-gray-50 px-6 py-3 border-b border-line">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Reglamento condominial</h3>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Gestión</p>
            <h4 className="text-sm font-semibold text-gray-900">Reglamentos del condominio</h4>
          </div>

          {reglamentosError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {reglamentosError}
            </div>
          ) : reglamentos.length === 0 ? (
            <div className="text-center text-sm text-gray-500">
              <p>No hay reglamentos disponibles en este momento.</p>
              <p className="mt-2 text-xs text-gray-400">
                Contacta a administración para solicitar el reglamento condominial actualizado.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {reglamentos.map((documento) => {
                  const isSelected = documento.id_proyectos_documentos === selectedReglamentoId;
                  return (
                    <button
                      key={documento.id_proyectos_documentos}
                      type="button"
                      onClick={() => onSelect(documento.id_proyectos_documentos)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-primary-dark text-white border-primary-dark"
                          : "bg-white text-gray-600 hover:text-gray-900 border-line"
                      }`}
                    >
                      <BookOpen className="h-3 w-3" />
                      {documento.nombre}
                    </button>
                  );
                })}
              </div>

              {selectedReglamento && (
                <div className="rounded-xl border border-line bg-gray-50 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Reglamento seleccionado
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-gray-900">{selectedReglamento.nombre}</h4>
                      {selectedReglamento.descripcion && (
                        <p className="mt-2 text-sm text-gray-600">{selectedReglamento.descripcion}</p>
                      )}
                      <p className="mt-3 text-xs text-gray-500">
                        Guarda este enlace para consultar el reglamento actualizado en cualquier momento.
                      </p>
                    </div>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                      <a
                        href={documentUrl(selectedReglamento.archivo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver reglamento
                      </a>
                      <a
                        href={documentUrl(selectedReglamento.archivo)}
                        download
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-primary-dark bg-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark/90"
                      >
                        <FileText className="h-4 w-4" />
                        Descargar PDF
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {reglamentos.map((documento) => (
                  <div
                    key={`reglamento-item-${documento.id_proyectos_documentos}`}
                    className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{documento.nombre}</p>
                        {documento.descripcion && <p className="text-xs text-gray-500">{documento.descripcion}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelect(documento.id_proyectos_documentos)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900"
                      >
                        Ver detalle
                      </button>
                      <a
                        href={documentUrl(documento.archivo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-primary-dark bg-primary-dark px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark/90"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
