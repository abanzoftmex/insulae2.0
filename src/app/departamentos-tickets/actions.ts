"use server";

import { revalidatePath } from "next/cache";

import {
  deleteTicketDepartmentUseCase,
  saveTicketDepartmentUseCase,
} from "@/modules/ticket-departments";

export interface SaveTicketDepartmentActionInput {
  id?: string;
  name: string;
  email: string;
}

export async function saveTicketDepartmentAction(
  input: SaveTicketDepartmentActionInput,
): Promise<{ ok: boolean; message: string; departmentId?: string }> {
  const result = await saveTicketDepartmentUseCase.execute(input);

  if (result.ok) {
    revalidatePath("/departamentos-tickets");
  }

  return result;
}

export async function deleteTicketDepartmentAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string; departmentId?: string }> {
  const departmentId = String(formData.get("departmentId") ?? "");
  const result = await deleteTicketDepartmentUseCase.execute(departmentId);

  if (result.ok) {
    revalidatePath("/departamentos-tickets");
  }

  return result;
}
