import { notFound } from "next/navigation";

import { getNotificationCategoryFormUseCase } from "@/modules/notification-categories";

import { CategoriaNotificacionFormShell } from "../../categoria-notificacion-form-shell";

interface EditarCategoriaNotificacionPageProps {
  params: Promise<{ categoryId: string }>;
}

export default async function EditarCategoriaNotificacionPage({
  params,
}: EditarCategoriaNotificacionPageProps) {
  const { categoryId } = await params;
  const snapshot = await getNotificationCategoryFormUseCase.execute(categoryId);

  if (!snapshot) {
    notFound();
  }

  return (
    <CategoriaNotificacionFormShell
      mode="edit"
      categoryId={snapshot.id}
      initialData={{
        name: snapshot.name,
        color: snapshot.color ?? "#6D5C53",
      }}
    />
  );
}
