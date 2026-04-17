import { notFound } from "next/navigation";

import { getTicketDepartmentFormUseCase } from "@/modules/ticket-departments";

import { DepartamentoTicketFormShell } from "../../departamento-ticket-form-shell";

interface EditarDepartamentoTicketPageProps {
  params: Promise<{ departmentId: string }>;
}

export default async function EditarDepartamentoTicketPage({ params }: EditarDepartamentoTicketPageProps) {
  const { departmentId } = await params;
  const snapshot = await getTicketDepartmentFormUseCase.execute(departmentId);

  if (!snapshot) {
    notFound();
  }

  return (
    <DepartamentoTicketFormShell
      mode="edit"
      departmentId={snapshot.id}
      initialData={{
        name: snapshot.name,
        email: snapshot.email,
      }}
    />
  );
}
