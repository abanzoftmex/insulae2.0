"use server";

import { revalidatePath } from "next/cache";
import { 
  updateBudgetMonthUseCase, 
  toggleBudgetStatusUseCase,
  importBudgetFromExcelUseCase,
  deleteBudgetGroupUseCase,
  deleteBudgetConceptUseCase
} from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function getFirstCondo() {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true }
  });
  if (!condo) throw new Error("No hay condominio activo configurado");
  return condo.id;
}

export async function updateBudgetAmountAction(
  year: number,
  budgetMonthId: string,
  amount: number
) {
  try {
    const condoId = await getFirstCondo();
    await updateBudgetMonthUseCase.execute(condoId, year, budgetMonthId, amount);
    revalidatePath("/presupuestos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

import { PrismaBudgetRepository } from "@/modules/budget/infrastructure/prisma-budget.repository";
const inlineRepo = new PrismaBudgetRepository();

export async function createBudgetAmountAction(
  year: number,
  budgetId: string,
  budgetConceptId: string,
  month: number,
  amount: number
) {
  try {
    const b = await inlineRepo.getBudget(await getFirstCondo(), year);
    if (b.status !== "OPEN") throw new Error("Presupuesto cerrado");

    await inlineRepo.createMonthAmount(budgetId, budgetConceptId, month, amount);
    revalidatePath("/presupuestos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleBudgetStatusAction(budgetId: string) {
  try {
    await toggleBudgetStatusUseCase.execute(budgetId);
    revalidatePath("/presupuestos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function importBudgetExcelAction(year: number, formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No se adjuntó ningún archivo");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const condoId = await getFirstCondo();
    const res = await importBudgetFromExcelUseCase.execute(condoId, year, buffer);
    
    revalidatePath("/presupuestos");
    return { success: true, ...res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBudgetGroupAction(groupId: string) {
  try {
    await deleteBudgetGroupUseCase.execute(groupId);
    revalidatePath("/listado-estructura-presupuesto");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBudgetConceptAction(conceptId: string) {
  try {
    await deleteBudgetConceptUseCase.execute(conceptId);
    revalidatePath("/listado-estructura-presupuesto");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveBudgetGroupAction(data: any) {
  try {
    await inlineRepo.saveBudgetGroup(data);
    revalidatePath("/listado-estructura-presupuesto");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
