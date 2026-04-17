import { CategoriaNotificacionFormShell } from "../categoria-notificacion-form-shell";

export default function NuevaCategoriaNotificacionPage() {
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
