"use server";

import { revalidatePath } from "next/cache";
import {
  createExpenseUseCase,
  updateExpenseUseCase,
  deleteExpenseUseCase,
  type SaveExpenseInput,
} from "@/modules/expense";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function getCondominiumId(): Promise<string> {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!condo) throw new Error("No hay condominio activo configurado");
  return condo.id;
}

export async function createExpenseAction(input: {
  date: string;
  concept: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  receiptUrl?: string;
  projectName?: string;
  budgetConceptId?: string;
}) {
  try {
    const condoId = await getCondominiumId();
    const saveInput: SaveExpenseInput = {
      date: new Date(input.date),
      concept: input.concept,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      receiptUrl: input.receiptUrl || null,
      projectName: input.projectName || null,
      budgetConceptId: input.budgetConceptId || null,
    };
    const result = await createExpenseUseCase.execute(condoId, saveInput);
    revalidatePath("/listado-gastos");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateExpenseAction(
  id: string,
  input: {
    date: string;
    concept: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
    receiptUrl?: string;
    projectName?: string;
    budgetConceptId?: string;
  },
) {
  try {
    const saveInput: SaveExpenseInput = {
      date: new Date(input.date),
      concept: input.concept,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      receiptUrl: input.receiptUrl || null,
      projectName: input.projectName || null,
      budgetConceptId: input.budgetConceptId || null,
    };
    const result = await updateExpenseUseCase.execute(id, saveInput);
    revalidatePath("/listado-gastos");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    await deleteExpenseUseCase.execute(id);
    revalidatePath("/listado-gastos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
