"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";
import { 
  saveMiscIncomeCatalogUseCase, 
  deleteMiscIncomeConceptUseCase,
  SaveMiscIncomeConcept
} from "@/modules/misc-income";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function getFirstCondo() {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true }
  });
  if (!condo) throw new Error("No hay condominio activo configurado");
  return condo.id;
}

export async function saveMiscIncomeCatalogAction(concepts: SaveMiscIncomeConcept[]) {
  try {
    await assertPermission(MODULES.OTROS_INGRESOS, "canUpdate");
    const condoId = await getFirstCondo();
    await saveMiscIncomeCatalogUseCase.execute(condoId, concepts);
    revalidatePath("/listado-estructura-otros-ingresos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMiscIncomeConceptAction(id: string) {
  try {
    await assertPermission(MODULES.OTROS_INGRESOS, "canDelete");
    await deleteMiscIncomeConceptUseCase.execute(id);
    revalidatePath("/listado-estructura-otros-ingresos");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
