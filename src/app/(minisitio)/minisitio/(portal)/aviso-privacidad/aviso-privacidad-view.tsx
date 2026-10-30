import { AlertCircle, ArrowUpRight, FileText, Shield } from "lucide-react";
import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";
import { AvisoPrivacidadTexto } from "@/components/minisitio/aviso-privacidad-texto";

const AVISO_PDF_LEGACY_BASE = "https://sistemasabanza.com/insulae/imagenes/proyectos/aviso_privacidad/";

/** Hoy llega solo el nombre del archivo legacy; si insulae2.0 guarda la URL del archivo, se usa tal cual. */
function avisoPdfUrl(archivo: string) {
  return isUsableFileUrl(archivo) ? archivo : `${AVISO_PDF_LEGACY_BASE}${archivo}`;
}

/**
 * Vista del aviso de privacidad. El texto llega plano (ver aviso-privacidad-texto.tsx, que le
 * devuelve títulos, secciones e incisos) y se lee en una columna de ~70 caracteres. Sin estado
 * ni interacción: se pinta en el servidor. El título del encabezado lo pone el shell por ruta.
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
      <p role="alert" className="flex items-center gap-2 rounded-xl bg-critical-bg px-4 py-3 text-[13.5px] text-overdue">
        <AlertCircle aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} />
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-mint shadow-[0_1px_2px_rgb(61_60_34/0.25)]">
          <Shield aria-hidden className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[24px] font-bold leading-8 tracking-[-0.02em] text-fg">Aviso de Privacidad</h2>
          <p className="text-[14px] leading-5 text-fg-3">Información sobre el tratamiento de sus datos personales</p>
        </div>
      </div>

      {/* Contenido principal */}
      <article className="rounded-2xl border border-stroke-2 bg-card px-5 py-7 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-[70ch]">
          {privacyNotice ? (
            <AvisoPrivacidadTexto texto={privacyNotice} />
          ) : (
            <div className="space-y-4 text-[15px] leading-6 text-fg-2">
              <h3 className="text-[16px] font-semibold text-fg">Aviso de Privacidad</h3>
              <p>Este aviso de privacidad describe cómo recopilamos, utilizamos y protegemos su información personal en el sistema Insulae.</p>
              <p>Al utilizar este sistema, usted acepta el tratamiento de sus datos personales conforme a las políticas establecidas.</p>
              <p>Para más información, puede contactar al administrador del sistema.</p>
            </div>
          )}
        </div>
      </article>

      {/* PDF del aviso de privacidad */}
      {pdfAviso && (
        <section className="rounded-2xl border border-stroke-2 bg-card p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-[16px] font-semibold text-fg">
            <FileText aria-hidden className="h-5 w-5 text-brand" strokeWidth={1.75} />
            Documento PDF
          </h2>
          <a
            href={avisoPdfUrl(pdfAviso)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-xl border border-stroke-2 p-4 outline-none transition-[background-color,border-color] duration-150 hover:border-stroke hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/45"
          >
            <span className="flex items-center gap-3">
              <FileText aria-hidden className="h-5 w-5 text-overdue" strokeWidth={1.75} />
              <span className="text-[14px] font-medium text-fg">Ver Aviso de Privacidad (PDF)</span>
            </span>
            <ArrowUpRight
              aria-hidden
              className="h-4 w-4 text-fg-4 transition-[color,translate] duration-150 group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-brand"
              strokeWidth={2}
            />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </section>
      )}
    </div>
  );
}
