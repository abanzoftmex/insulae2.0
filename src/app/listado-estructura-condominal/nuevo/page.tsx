import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { notFound } from "next/navigation";

import { getCondominiumStructureFormTemplateUseCase } from "@/modules/condominium-structure";

import { EstructuraCondominalFormShell } from "../estructura-condominal-form-shell";

export default async function NuevoGrupoEstructuraCondominalPage() {
  await requirePageAccess(MODULES.ESTRUCTURA_CONDOMINAL);

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
