import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { SyncTable } from "../components/sincronizacion-luca-workbench";
import { getActiveCondominium, getIncomeRows, getIncomeCatalogsAndGroups } from "../_lib/data";

export const metadata: Metadata = {
  title: "Cobros · Sincronización con Luca | Insulae 2.0",
  description: "Ingresos que Luca ligó a una propiedad, pendientes de validar o ejecutar.",
};

export const dynamic = "force-dynamic";

export default async function CobrosSincronizacionPage() {
  const condominium = await getActiveCondominium();

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
      </div>
    );
  }

  const [incomes, { catalogs, chargeGroups }] = await Promise.all([
    getIncomeRows(condominium.id),
    getIncomeCatalogsAndGroups(condominium.id),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Cobros</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Sincronización con Luca</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">{condominium.name}</p>
          </div>
        </div>
      </div>

      <SyncTable
        title="Cobros"
        description="Ingresos que Luca ligó a una propiedad. Confirma la forma de pago, asigna categoría y grupo financiero, y ejecuta para que aparezcan en el estado de cuenta del condómino."
        rows={incomes}
        entityType="incomes"
        refColumnLabel="Propiedad"
        catalogs={catalogs}
        chargeGroups={chargeGroups}
      />
    </div>
  );
}
