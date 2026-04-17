import { notFound } from "next/navigation";

import { getTicketResponseFormUseCase, toTicketResponseFormVM } from "@/modules/tickets";

import { TicketResponseFormShell } from "../../ticket-response-form-shell";

interface EditarTicketPageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function EditarTicketPage({ params }: EditarTicketPageProps) {
  const { ticketId } = await params;
  const formData = await getTicketResponseFormUseCase.execute(ticketId);

  if (!formData) {
    notFound();
  }

  const vm = toTicketResponseFormVM(formData);
  if (!vm) {
    notFound();
  }

  return (
    <TicketResponseFormShell
      ticketId={vm.snapshot.id}
      condominiumSlug={formData.condominiumSlug}
      statusOptions={vm.statusOptions}
      initialData={vm.snapshot}
    />
  );
}
