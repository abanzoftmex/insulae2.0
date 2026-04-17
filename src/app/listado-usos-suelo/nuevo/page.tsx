import type { Metadata } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";

import { getLandUseFormTemplateUseCase } from "@/modules/land-uses";

import { UsoSueloFormShell } from "../uso-suelo-form-shell";

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
  title: "Nuevo uso de suelo | Insulae 2.0",
  description: "Formulario de alta de usos de suelo para Insulae 2.0.",
};

export const dynamic = "force-dynamic";

export default async function NuevoUsoSueloPage() {
  const template = await getLandUseFormTemplateUseCase.execute();

  return (
    <div className={`${display.variable} ${body.variable}`}>
      <UsoSueloFormShell
        mode="create"
        initialData={{
          name: "",
          initials: "",
          order: "",
          weight: "",
          percentage: "",
          charges:
            template?.columns.map((column) => ({
              key: column.key,
              year: column.year,
              chargeGroupId: column.chargeGroupId,
              chargeGroupName: column.chargeGroupName,
              amount: "0",
              applicationMode: "ONE_TIME",
            })) ?? [],
        }}
      />
    </div>
  );
}
