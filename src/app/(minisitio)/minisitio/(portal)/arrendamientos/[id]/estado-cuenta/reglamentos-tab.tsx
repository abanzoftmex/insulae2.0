"use client";

import { BookOpen, Download, ExternalLink, FileText } from "lucide-react";
import { BUTTON } from "@/components/minisitio/ui/list-controls";
import { StatementSection } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/statement-ui";
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
    <StatementSection title="Reglamento condominial" description="Gestión · Reglamentos del condominio">
      {reglamentosError ? (
        <p role="alert" className="rounded-xl bg-critical-bg px-4 py-3 text-[13.5px] text-overdue">
          {reglamentosError}
        </p>
      ) : reglamentos.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[14px] text-fg-2">No hay reglamentos disponibles en este momento.</p>
          <p className="mt-1.5 text-[13px] text-fg-3">Contacta a administración para solicitar el reglamento condominial actualizado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selector rápido */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir reglamento">
            {reglamentos.map((documento) => {
              const isSelected = documento.id_proyectos_documentos === selectedReglamentoId;
              return (
                <button
                  key={documento.id_proyectos_documentos}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(documento.id_proyectos_documentos)}
                  className={`flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-left text-[12.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/45 ${
                    isSelected ? "border-brand bg-brand text-white" : "border-stroke-2 bg-card text-fg-2 hover:border-stroke hover:bg-surface-3"
                  }`}
                >
                  <BookOpen aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="min-w-0 truncate">{documento.nombre}</span>
                </button>
              );
            })}
          </div>

          {selectedReglamento && (
            <div className="animate-rise-in rounded-xl bg-gold-soft p-5 ring-1 ring-inset ring-brand-accent/25">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-warning">Reglamento seleccionado</p>
                  <h3 className="mt-1 text-[16px] font-semibold leading-6 text-fg">{selectedReglamento.nombre}</h3>
                  {selectedReglamento.descripcion && <p className="mt-1.5 text-[13.5px] text-fg-2">{selectedReglamento.descripcion}</p>}
                  <p className="mt-2 text-[12.5px] text-fg-3">Guarda este enlace para consultar el reglamento actualizado en cualquier momento.</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <a href={documentUrl(selectedReglamento.archivo)} target="_blank" rel="noopener noreferrer" className={BUTTON.secondary}>
                    <ExternalLink aria-hidden className="h-4 w-4" strokeWidth={2} />
                    Ver reglamento
                  </a>
                  <a href={documentUrl(selectedReglamento.archivo)} download className={BUTTON.primary}>
                    <Download aria-hidden className="h-4 w-4" strokeWidth={2} />
                    Descargar PDF
                  </a>
                </div>
              </div>
            </div>
          )}

          <ul className="divide-y divide-stroke-3 overflow-hidden rounded-xl border border-stroke-2">
            {reglamentos.map((documento) => (
              <li
                key={`reglamento-item-${documento.id_proyectos_documentos}`}
                className="flex flex-col gap-3 bg-card px-4 py-3.5 transition-colors duration-100 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/[0.08] text-brand">
                    <FileText aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium leading-5 text-fg">{documento.nombre}</p>
                    {documento.descripcion && <p className="text-[12.5px] text-fg-3">{documento.descripcion}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => onSelect(documento.id_proyectos_documentos)} className={`${BUTTON.secondary} h-8 px-3 text-[13px]`}>
                    Ver detalle
                  </button>
                  <a
                    href={documentUrl(documento.archivo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BUTTON.primary} h-8 px-3 text-[13px]`}
                  >
                    <ExternalLink aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                    Abrir
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </StatementSection>
  );
}
