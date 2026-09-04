import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getNotificationFormUseCase } from "@/modules/notifications";

import { NotificacionFormShell } from "../notificacion-form-shell";

export default async function NuevaNotificacionPage() {
  await requirePageAccess(MODULES.NOTIFICACIONES);

  const formData = await getNotificationFormUseCase.execute();

  if (!formData) {
    return null;
  }

  return (
    <NotificacionFormShell
      mode="create"
      condominiumSlug={formData.condominiumSlug}
      options={{
        typeOptions: formData.typeOptions,
        categoryOptions: formData.categoryOptions,
      }}
      initialData={{
        title: "",
        message: "",
        sentAt: "",
        validUntil: "",
        audienceTypeId: "3",
        categoryId: "",
        imageUrl: "",
        imagePath: "",
        pdfUrl: "",
        pdfPath: "",
      }}
    />
  );
}
