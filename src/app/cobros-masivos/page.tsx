import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { MassChargeWizard } from "./components/mass-charge-wizard";

export const dynamic = "force-dynamic";

export default async function MassChargePage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
  });

  if (!condominium) {
    return <div className="p-8">No se encontro el condominio activo.</div>;
  }

  // Fetch Zones (Barrios)
  const zones = await prisma.zoneCatalog.findMany({
    where: { condominiumId: condominium.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Fetch Charge Groups (Tipos de cobro)
  const chargeGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: condominium.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, legacyId: true },
  });

  return (
    <main className="min-h-screen bg-[#fcf9f5] pb-24">
      <MassChargeWizard
        condominiumId={condominium.id}
        zones={zones.map((z) => z.name)}
        chargeGroups={chargeGroups}
      />
    </main>
  );
}
