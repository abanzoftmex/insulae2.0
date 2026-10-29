"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/db/prisma";

// Archiva (no borra) los rechazos actuales para que dejen de contar en la
// alerta de la tarjeta "Rechazados" — quedan visibles en el desplegable
// "Historial" de la misma pantalla.
export async function archiveRejectedSyncEventsAction(condominiumId: string): Promise<void> {
    await assertPermission(MODULES.SINCRONIZACION_LUCA, "canUpdate");
  if (!condominiumId) return;

  await prisma.lucaSyncEvent.updateMany({
    where: { condominiumId, status: "REJECTED", archivedAt: null },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/sincronizacion-luca");
  revalidatePath("/sincronizacion-luca/rechazados");
}
