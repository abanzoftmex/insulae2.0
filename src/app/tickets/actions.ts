"use server";

import { revalidatePath } from "next/cache";

import { saveTicketResponseUseCase, getTicketResponseFormUseCase, toTicketResponseFormVM } from "@/modules/tickets";
import type { TicketStatusValue } from "@/modules/tickets/domain/ticket";

export interface SaveTicketResponseActionInput {
  id: string;
  response: string;
  status: TicketStatusValue;
  responseImageUrl?: string | null;
  responseImagePath?: string | null;
  responsePdfUrl?: string | null;
  responsePdfPath?: string | null;
}

export async function getTicketResponseFormDataAction(id: string) {
  const data = await getTicketResponseFormUseCase.execute(id);
  return data ? toTicketResponseFormVM(data) : null;
}

export async function saveTicketResponseAction(
  input: SaveTicketResponseActionInput,
): Promise<{ ok: boolean; message: string; ticketId?: string }> {
  const result = await saveTicketResponseUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/tickets");
  }

  return result;
}
