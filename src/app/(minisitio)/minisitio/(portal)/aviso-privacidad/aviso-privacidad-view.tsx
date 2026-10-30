import { Shield, FileText } from "lucide-react";
import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";

const AVISO_PDF_LEGACY_BASE = "https://sistemasabanza.com/insulae/imagenes/proyectos/aviso_privacidad/";

/** Hoy llega solo el nombre del archivo legacy; si insulae2.0 guarda la URL del archivo, se usa tal cual. */
function avisoPdfUrl(archivo: string) {
  return isUsableFileUrl(archivo) ? archivo : `${AVISO_PDF_LEGACY_BASE}${archivo}`;
}

/**
 * Vista del aviso de privacidad (HTML del proyecto, estilos `.aviso-privacidad-html` de
 * minisitio.css). Sin estado ni interacción: se pinta en el servidor. El título del
 * encabezado lo pone el shell por ruta (antes setPageData).
 */
export function AvisoPrivacidadView({
  privacyNotice,
  pdfAviso,
  error,
}: {
  privacyNotice: string;
  pdfAviso: string | null;
  error: string | null;
}) {
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
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Aviso de Privacidad
            </h1>
            <p className="text-gray-600">
              Información sobre el tratamiento de sus datos personales
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
        <div className="p-6">
          <div className="prose max-w-none">
            {privacyNotice ? (
              <div
                className="aviso-privacidad-html text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: privacyNotice }}
              />
            ) : (
              <div className="text-gray-600">
                <h3 className="text-lg font-semibold mb-4">
                  Aviso de Privacidad
                </h3>
                <p className="mb-4">
                  Este aviso de privacidad describe cómo recopilamos, utilizamos
                  y protegemos su información personal en el sistema Insulae.
                </p>
                <p className="mb-4">
                  Al utilizar este sistema, usted acepta el tratamiento de sus
                  datos personales conforme a las políticas establecidas.
                </p>
                <p>
                  Para más información, puede contactar al administrador del
                  sistema.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF del Aviso de Privacidad */}
      {pdfAviso && (
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-6 h-6 text-amber-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Documento PDF
              </h2>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <a
                href={avisoPdfUrl(pdfAviso)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-gray-900">
                    Ver Aviso de Privacidad (PDF)
                  </span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
