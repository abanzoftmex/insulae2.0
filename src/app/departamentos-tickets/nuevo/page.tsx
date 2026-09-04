import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { DepartamentoTicketFormShell } from "../departamento-ticket-form-shell";

export default async function NuevoDepartamentoTicketPage() {
  await requirePageAccess(MODULES.DEPARTAMENTOS_TICKETS);

  return (
    <DepartamentoTicketFormShell
      mode="create"
      initialData={{
        name: "",
        email: "",
        whatsapp: "",
      }}
    />
  );
}
