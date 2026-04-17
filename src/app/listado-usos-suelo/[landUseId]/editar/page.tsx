import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";

import { getLandUseFormUseCase, getLandUseListingUseCase } from "@/modules/land-uses";

import { UsoSueloFormShell } from "../../uso-suelo-form-shell";

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-landuse-display",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landuse-body",
});

export const metadata: Metadata = {
  title: "Editar uso de suelo | Insulae 2.0",
  description: "Formulario de edicion de usos de suelo para Insulae 2.0.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ landUseId: string }>;
};

export default async function EditarUsoSueloPage({ params }: PageProps) {
  const { landUseId } = await params;

  const [snapshot, listing] = await Promise.all([
    getLandUseFormUseCase.execute(landUseId),
    getLandUseListingUseCase.execute(),
  ]);

  if (!snapshot) {
    notFound();
  }

  return (
    <div className={`${display.variable} ${body.variable}`}>
      <UsoSueloFormShell
        mode="edit"
        landUseId={snapshot.id}
        usesLandUseFormula={listing?.usesLandUseFormula ?? false}
        initialData={{
          name: snapshot.name,
          initials: snapshot.initials ?? "",
          order: snapshot.order !== null ? String(snapshot.order) : "",
          weight: snapshot.weight !== null ? String(snapshot.weight) : "",
          percentage: snapshot.percentage !== null ? String(snapshot.percentage) : "",
          charges: snapshot.charges.map((charge) => ({
            key: charge.key,
            year: charge.year,
            chargeGroupId: charge.chargeGroupId,
            chargeGroupName: charge.chargeGroupName,
            amount: String(charge.amount),
            applicationMode: charge.applicationMode,
          })),
        }}
      />
    </div>
  );
}
