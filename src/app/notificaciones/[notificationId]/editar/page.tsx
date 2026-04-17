import { notFound } from "next/navigation";

import { getNotificationFormUseCase } from "@/modules/notifications";

import { NotificacionFormShell } from "../../notificacion-form-shell";

interface EditarNotificacionPageProps {
  params: Promise<{ notificationId: string }>;
}

export default async function EditarNotificacionPage({ params }: EditarNotificacionPageProps) {
  const { notificationId } = await params;
  const formData = await getNotificationFormUseCase.execute(notificationId);

  if (!formData || !formData.snapshot) {
    notFound();
  }

  return (
    <NotificacionFormShell
      mode="edit"
      notificationId={formData.snapshot.id}
      condominiumSlug={formData.condominiumSlug}
      options={{
        typeOptions: formData.typeOptions,
        categoryOptions: formData.categoryOptions,
      }}
      initialData={{
        title: formData.snapshot.title,
        message: formData.snapshot.message,
        sentAt: formData.snapshot.sentAt,
        validUntil: formData.snapshot.validUntil,
        audienceTypeId: formData.snapshot.audienceTypeId,
        categoryId: formData.snapshot.categoryId,
        imageUrl: formData.snapshot.imageUrl,
        imagePath: formData.snapshot.imagePath,
        pdfUrl: formData.snapshot.pdfUrl,
        pdfPath: formData.snapshot.pdfPath,
      }}
    />
  );
}
