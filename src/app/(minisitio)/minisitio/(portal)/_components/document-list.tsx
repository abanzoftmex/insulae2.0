/**
 * Lista de documentos del condominio (reglamentos, estatutos, actas): uno por fila, con su
 * descripción, y se abren en otra pestaña. La usan "Documentos del condominio" y la pestaña de
 * reglamentos del estado de cuenta del comercio.
 */
import { ArrowUpRight, FileText } from "lucide-react";
import type { Documento } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { LoadError } from "@/components/minisitio/ui/load-error";
import { documentUrl } from "../_lib/estado-cuenta-utils";

export function DocumentList({ documentos, failed = false }: { documentos: Documento[]; failed?: boolean }) {
  if (failed) return <LoadError what="los documentos" />;
  if (documentos.length === 0) {
    return <p className="py-12 text-center text-body text-fg-2">Todavía no hay documentos publicados.</p>;
  }
  return (
    <ul className="divide-y divide-stroke-3">
      {documentos.map((d) => (
        <li key={d.id_proyectos_documentos}>
          <a
            href={documentUrl(d.archivo)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 py-3 outline-none focus-visible:bg-surface-2 sm:-mx-3 sm:rounded-panel sm:px-3 sm:hover:bg-surface-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-surface bg-surface-3 text-fg-2">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-fg">{d.nombre}</span>
              {d.descripcion && <span className="line-clamp-2 block text-caption text-fg-3">{d.descripcion}</span>}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-body font-medium text-brand group-hover:underline">
              Abrir
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
