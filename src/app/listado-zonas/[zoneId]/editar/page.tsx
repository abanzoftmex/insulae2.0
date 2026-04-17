import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lora, Nunito_Sans } from "next/font/google";

import { getZoneFormUseCase } from "@/modules/zones";

import { ZonaFormShell } from "../../zona-form-shell";

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-zones-display",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-zones-body",
});

export const metadata: Metadata = {
  title: "Editar Barrio | Insulae 2.0",
  description: "Formulario de edicion de barrios para Insulae 2.0.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ zoneId: string }>;
};

export default async function EditarBarrioPage({ params }: PageProps) {
  const { zoneId } = await params;
  const zone = await getZoneFormUseCase.execute(zoneId);

  if (!zone) {
    notFound();
  }

  return (
    <div className={`${lora.variable} ${nunito.variable}`}>
      <ZonaFormShell
        mode="edit"
        zoneId={zone.id}
        initialName={zone.name}
        initialInitials={zone.initials ?? ""}
      />
    </div>
  );
}
