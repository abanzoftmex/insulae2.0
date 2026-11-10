import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getIncomeUseCase } from "@/modules/income";
import { IncomeEditPage } from "./income-edit-page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIncomePage({ params }: PageProps) {
  await requirePageAccess(MODULES.COBROS, "canUpdate");

  const { id } = await params;

  const income = await getIncomeUseCase.execute(id);
  if (!income) notFound();

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  if (!condominium) {
    return <div className="p-20 text-center text-[#6d422a]">No hay condominio activo.</div>;
  }

  const [catalogs, chargeGroups, areas] = await Promise.all([
    prisma.miscIncomeCatalog.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.chargeGroup.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.privateArea.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      select: { id: true, name: true, code: true, zone: true },
    }),
  ]);

  // Orden natural alfanumérico para el catálogo completo de propiedades
  areas.sort((a, b) => {
    const keyA = (a.code || a.name || "").trim();
    const keyB = (b.code || b.name || "").trim();
    return keyA.localeCompare(keyB, "es-MX", { numeric: true, sensitivity: "base" });
  });

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <IncomeEditPage
        income={income}
        catalogs={catalogs}
        chargeGroups={chargeGroups}
        areas={areas}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </main>
  );
}
