import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { RejectedTable, RejectedHistoryTable } from "../components/sincronizacion-luca-workbench";
import { getActiveCondominium, getRejectedRows } from "../_lib/data";
import { ArchiveRejectedButton } from "./archive-rejected-button";

export const metadata: Metadata = {
  title: "Rechazados · Sincronización con Luca | Insulae 2.0",
  description: "Movimientos que Luca mandó pero Insulae no pudo procesar.",
};

export const dynamic = "force-dynamic";

export default async function RechazadosSincronizacionPage() {
  const condominium = await getActiveCondominium();

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
      </div>
    );
  }

  const { active, archived } = await getRejectedRows(condominium.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Rechazados</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Sincronización con Luca</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">{condominium.name}</p>
          </div>
        </div>
        <ArchiveRejectedButton condominiumId={condominium.id} count={active.length} />
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-brand/15 bg-card py-16 text-ink-soft">
          <p className="text-sm font-medium">No hay movimientos rechazados pendientes de revisar.</p>
        </div>
      ) : (
        <RejectedTable rows={active} />
      )}

      <details className="group rounded-card border border-brand/15 bg-card open:pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-soft/70 select-none">
          <span>Historial ({archived.length})</span>
          <span className="text-ink-soft/40 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="px-6 pb-4">
          <RejectedHistoryTable rows={archived} />
        </div>
      </details>
    </div>
  );
}
