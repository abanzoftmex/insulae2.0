import { prisma } from "@/shared/infrastructure/db/prisma";
import type { Metadata } from "next";
import { MassChargeWorkbench } from "./components/mass-charge-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export const metadata: Metadata = {
  title: "Cobros Masivos | Insulae 2.0",
  description: "Generación masiva de cargos y cuotas por barrio y categoría.",
};

export const dynamic = "force-dynamic";

export default async function MassChargePage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
      </div>
    );
  }

  const [zones, chargeGroups] = await Promise.all([
    prisma.zoneCatalog.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.chargeGroup.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, legacyId: true },
    }),
  ]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Cobros Masivos</h1>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condominium.name} · Procesamiento por lote de cargos financieros.
            </p>
          </div>
        </div>
      </div>

      <MassChargeWorkbench
        condominiumId={condominium.id}
        zones={zones.map((z) => z.name)}
        chargeGroups={chargeGroups}
      />
    </div>
  );
}
