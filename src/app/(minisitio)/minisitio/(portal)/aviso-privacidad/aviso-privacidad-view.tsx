import { ArrowUpRight, FileText } from "lucide-react";
import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";
import { AvisoPrivacidadTexto } from "@/components/minisitio/aviso-privacidad-texto";
import { LoadError } from "@/components/minisitio/ui/load-error";

const AVISO_PDF_LEGACY_BASE = "https://sistemasabanza.com/insulae/imagenes/proyectos/aviso_privacidad/";

/** Hoy llega solo el nombre del archivo legacy; si insulae2.0 guarda la URL del archivo, se usa tal cual. */
function avisoPdfUrl(archivo: string) {
  return isUsableFileUrl(archivo) ? archivo : `${AVISO_PDF_LEGACY_BASE}${archivo}`;
}

/**
 * Aviso de privacidad como documento: el PDF a la mano arriba y el texto con ancho de lectura.
 * Sin aviso publicado se dice así (antes se suplía con un texto genérico que parecía el aviso).
 * Sin estado: se pinta en el servidor; el título del encabezado lo pone el shell por ruta.
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
      <div className="mx-auto w-full max-w-[720px]">
        <LoadError what="el aviso de privacidad" />
      </div>
    );
  }

  if (!privacyNotice && !pdfAviso) {
    return <p className="py-12 text-center text-body text-fg-2">La administración todavía no publica el aviso de privacidad.</p>;
  }

  return (
    <article className="mx-auto w-full max-w-[720px] pb-10">
      <p className="text-body text-fg-3">Qué datos personales se recaban, para qué se usan y cómo ejercer tus derechos sobre ellos.</p>
      {pdfAviso && (
        <a
          href={avisoPdfUrl(pdfAviso)}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-4 flex items-center gap-3 rounded-panel border border-stroke-2 p-3 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-surface bg-surface-3 text-fg-2">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-fg">Aviso de privacidad en PDF</span>
            <span className="block text-caption text-fg-3">Para guardarlo o imprimirlo</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-body font-medium text-brand group-hover:underline">
            Abrir
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      )}
      {privacyNotice && (
        <div className="mt-8">
          <AvisoPrivacidadTexto texto={privacyNotice} />
        </div>
      )}
    </article>
  );
}
