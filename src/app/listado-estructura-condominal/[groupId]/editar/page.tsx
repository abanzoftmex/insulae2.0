import { notFound } from "next/navigation";

import { getCondominiumStructureFormUseCase } from "@/modules/condominium-structure";

import { EstructuraCondominalFormShell } from "../../estructura-condominal-form-shell";

interface EditarGrupoEstructuraCondominalPageProps {
  params: Promise<{
    groupId: string;
  }>;
}

export default async function EditarGrupoEstructuraCondominalPage({
  params,
}: EditarGrupoEstructuraCondominalPageProps) {
  const { groupId } = await params;
  const snapshot = await getCondominiumStructureFormUseCase.execute(groupId);

  if (!snapshot) {
    notFound();
  }

  return (
    <EstructuraCondominalFormShell
      mode="edit"
      groupId={snapshot.id}
      initialData={{
        name: snapshot.name,
        position: String(snapshot.position),
        structureType: snapshot.structureType,
        concepts: snapshot.concepts.map((concept) => ({
          id: concept.id,
          name: concept.name,
          quantity: String(concept.quantity),
          isAlternate: concept.isAlternate,
        })),
      }}
    />
  );
}
