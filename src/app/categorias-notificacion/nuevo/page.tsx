import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { CategoriaNotificacionFormShell } from "../categoria-notificacion-form-shell";

export default async function NuevaCategoriaNotificacionPage() {
  await requirePageAccess(MODULES.CATEGORIAS_NOTIFICACIONES);

  return (
    <CategoriaNotificacionFormShell
      mode="create"
      initialData={{
        name: "",
        color: "#6D5C53",
      }}
    />
  );
}
