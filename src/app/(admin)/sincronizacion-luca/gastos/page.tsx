import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { SyncTable } from "../components/sincronizacion-luca-workbench";
import { getActiveCondominium, getExpenseRows } from "../_lib/data";

export const metadata: Metadata = {
  title: "Gastos · Sincronización con Luca | Insulae 2.0",
  description: "Egresos que Luca ligó a una partida presupuestal, pendientes de validar o ejecutar.",
};

export const dynamic = "force-dynamic";

export default async function GastosSincronizacionPage() {
  await requirePageAccess(MODULES.SINCRONIZACION_LUCA);

  const condominium = await getActiveCondominium();

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
      </div>
    );
  }

  const expenses = await getExpenseRows(condominium.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Gastos</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Sincronización con Luca</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">{condominium.name}</p>
          </div>
        </div>
      </div>

      <SyncTable
        title="Gastos"
        description="Egresos que Luca ligó a una partida presupuestal. Revisa y ejecuta con un clic."
        rows={expenses}
        entityType="expenses"
        refColumnLabel="Partida"
      />
    </div>
  );
}
