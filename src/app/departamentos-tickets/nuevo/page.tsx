import { DepartamentoTicketFormShell } from "../departamento-ticket-form-shell";

export default function NuevoDepartamentoTicketPage() {
  return (
    <DepartamentoTicketFormShell
      mode="create"
      initialData={{
        name: "",
        email: "",
      }}
    />
  );
}
