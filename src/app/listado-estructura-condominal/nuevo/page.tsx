import { notFound } from "next/navigation";

import { getCondominiumStructureFormTemplateUseCase } from "@/modules/condominium-structure";

import { EstructuraCondominalFormShell } from "../estructura-condominal-form-shell";

export default async function NuevoGrupoEstructuraCondominalPage() {
  const template = await getCondominiumStructureFormTemplateUseCase.execute();

  if (!template) {
    notFound();
  }

  return (
    <EstructuraCondominalFormShell
      mode="create"
      initialData={{
        name: "",
        position: String(template.suggestedPosition),
        structureType: 0,
        concepts: [],
      }}
    />
  );
}
