"use server";

import { revalidatePath } from "next/cache";
import {
  createIncomeUseCase,
  updateIncomeUseCase,
  deleteIncomeUseCase,
  type SaveIncomeInput,
} from "@/modules/income";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function getCondominiumId(): Promise<string> {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!condo) throw new Error("No hay condominio activo configurado");
  return condo.id;
}

export async function createIncomeAction(input: {
  date: string;
  concept: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  receiptUrl?: string;
  miscCatalogId?: string;
  chargeGroupId?: string;
  privateAreaId?: string;
}) {
  try {
    const condoId = await getCondominiumId();
    const saveInput: SaveIncomeInput = {
      date: new Date(input.date),
      concept: input.concept,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      receiptUrl: input.receiptUrl || null,
      miscCatalogId: input.miscCatalogId || null,
      chargeGroupId: input.chargeGroupId || null,
      privateAreaId: input.privateAreaId || null,
    };
    const result = await createIncomeUseCase.execute(condoId, saveInput);
    revalidatePath("/listado-ingresos");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateIncomeAction(
  id: string,
  input: {
    date: string;
    concept: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
    receiptUrl?: string;
    miscCatalogId?: string;
    chargeGroupId?: string;
    privateAreaId?: string;
  },
) {
  try {
    const saveInput: SaveIncomeInput = {
      date: new Date(input.date),
      concept: input.concept,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      receiptUrl: input.receiptUrl || null,
      miscCatalogId: input.miscCatalogId || null,
      chargeGroupId: input.chargeGroupId || null,
      privateAreaId: input.privateAreaId || null,
    };
    const result = await updateIncomeUseCase.execute(id, saveInput);
    revalidatePath("/listado-ingresos");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteIncomeAction(id: string) {
  try {
    await deleteIncomeUseCase.execute(id);
    revalidatePath("/listado-ingresos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
