"use server";

import { revalidatePath } from "next/cache";

import { saveTicketResponseUseCase, getTicketResponseFormUseCase, toTicketResponseFormVM } from "@/modules/tickets";
import type { TicketStatusValue } from "@/modules/tickets/domain/ticket";
import { getCurrentUser } from "@/app/actions/auth";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

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

export async function createTicketAction(data: {
  title: string;
  description: string;
  departmentId: string;
  privateAreaId: string;
}) {
  try {
    const condominium = await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true },
    });

    if (!condominium) return { ok: false, message: "Condominio inactivo" };

    const currentUserId = await getCurrentUser();

    await prisma.ticket.create({
      data: {
        condominiumId: condominium.id,
        title: data.title,
        description: data.description,
        departmentId: data.departmentId || null,
        privateAreaId: data.privateAreaId || null,
        openedById: currentUserId || null,
        status: "OPEN",
      },
    });

    revalidatePath("/tickets");
    return { ok: true, message: "Ticket creado correctamente" };
  } catch (error) {
    console.error("[createTicketAction] Error:", error);
    return { ok: false, message: "Error al crear el ticket" };
  }
}

