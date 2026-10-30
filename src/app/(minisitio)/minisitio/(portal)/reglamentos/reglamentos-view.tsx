import { AlertCircle, ArrowUpRight, BookOpen, FileText } from "lucide-react";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { documentoUrl } from "@/components/minisitio/documento-url";

/**
 * Vista de "Documentos Condominales". Sin estado ni interacción: se pinta en el servidor.
 * El título del encabezado lo pone el shell por ruta (antes setPageData).
 */
export function ReglamentosView({ documentos, error }: { documentos: Documento[]; error: string | null }) {
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
          <BookOpen aria-hidden className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[24px] font-bold leading-8 tracking-[-0.02em] text-fg">Documentos Condominales</h2>
          <p className="text-[14px] leading-5 text-fg-3">Documentos y reglamentos importantes del condominio</p>
        </div>
      </div>

      {/* Listado de documentos */}
      <section aria-labelledby="documentos-disponibles" className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
        <div className="flex items-baseline justify-between gap-3 border-b border-stroke-3 px-5 py-4 sm:px-6">
          <h3 id="documentos-disponibles" className="text-[16px] font-semibold text-fg">
            Documentos disponibles
          </h3>
          {documentos.length > 0 && (
            <span className="text-[13px] text-fg-3 tabular-nums">
              {documentos.length} documento{documentos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {documentos.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-fg-4">
              <FileText aria-hidden className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="text-[14px] text-fg-3">No hay documentos disponibles en este momento.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stroke-3">
            {documentos.map((documento) => (
              <li key={documento.id_proyectos_documentos}>
                {/* Toda la fila abre el documento: antes solo el botón, y la fila parecía clicable. */}
                <a
                  href={documentoUrl(documento.archivo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 px-5 py-4 outline-none transition-colors duration-100 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/45 sm:px-6"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                    <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium leading-5 text-fg">{documento.nombre}</span>
                    <span className="block text-[12.5px] text-fg-3">Documento oficial</span>
                  </span>
                  <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-stroke-2 bg-card px-3.5 text-[13px] font-semibold text-fg-2 transition-[background-color,border-color,color] duration-150 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                    <span className="hidden sm:inline">Ver documento</span>
                    <ArrowUpRight
                      aria-hidden
                      className="h-4 w-4 transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
