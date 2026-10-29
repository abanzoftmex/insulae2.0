import { BookOpen, FileText, ExternalLink } from "lucide-react";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";

const DOCUMENTOS_LEGACY_BASE = "https://sistemasabanza.com/insulae/imagenes/documentos/";

/** insulae2.0 guarda URLs completas (Firebase); se conserva la ruta legacy si llega solo el nombre. */
function documentoUrl(archivo: string) {
  return /^https?:\/\//.test(archivo) ? archivo : `${DOCUMENTOS_LEGACY_BASE}${archivo}`;
}

/**
 * Vista de "Documentos Condominales". Sin estado ni interacción: se pinta en el servidor.
 * El título del encabezado lo pone el shell por ruta (antes setPageData).
 */
export function ReglamentosView({ documentos, error }: { documentos: Documento[]; error: string | null }) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentos Condominales</h1>
            <p className="text-gray-600">
              Documentos y reglamentos importantes del condominio
            </p>
          </div>
        </div>
      </div>

      {/* Listado de documentos */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Documentos disponibles</h2>

          {documentos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay documentos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documentos.map((documento) => (
                <div
                  key={documento.id_proyectos_documentos}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{documento.nombre}</p>
                      <p className="text-sm text-gray-500">Documento oficial</p>
                    </div>
                  </div>
                  <a
                    href={documentoUrl(documento.archivo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-dark text-white rounded-lg hover:bg-primary-dark/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ver documento</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
