"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/db/prisma";

interface ImportRow {
  miscCatalogId?: string;
  chargeGroupId?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  concept: string;
  notes?: string;
}

const VALID_METHODS = new Set(["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"]);

export async function importIncomesAction(rows: ImportRow[]) {
  try {
    const condo = await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!condo) return { success: false, error: "No condominium found" };

    // Validate catalog IDs exist
    const catalogIds = new Set(
      rows.map((r) => r.miscCatalogId).filter(Boolean) as string[],
    );
    const chargeGroupIds = new Set(
      rows.map((r) => r.chargeGroupId).filter(Boolean) as string[],
    );

    const validCatalogs =
      catalogIds.size > 0
        ? new Set(
            (
              await prisma.miscIncomeCatalog.findMany({
                where: { id: { in: [...catalogIds] }, condominiumId: condo.id, isActive: true },
                select: { id: true },
              })
            ).map((c) => c.id),
          )
        : new Set<string>();

    const validGroups =
      chargeGroupIds.size > 0
        ? new Set(
            (
              await prisma.chargeGroup.findMany({
                where: { id: { in: [...chargeGroupIds] }, condominiumId: condo.id, isActive: true },
                select: { id: true },
              })
            ).map((g) => g.id),
          )
        : new Set<string>();

    const errors: string[] = [];
    const validRows: Array<{
      condominiumId: string;
      date: Date;
      amount: number;
      concept: string;
      paymentMethod: any;
      notes: string | null;
      miscCatalogId: string | null;
      chargeGroupId: string | null;
      isActive: boolean;
      isConfirmed: boolean;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // header is line 1

      if (!row.date || isNaN(Date.parse(row.date))) {
        errors.push(`Fila ${lineNum}: Fecha inválida`);
        continue;
      }

      if (!row.amount || row.amount <= 0) {
        errors.push(`Fila ${lineNum}: Monto inválido`);
        continue;
      }

      const method = (row.paymentMethod || "").toUpperCase().trim();
      if (!VALID_METHODS.has(method)) {
        errors.push(
          `Fila ${lineNum}: Forma de pago inválida "${row.paymentMethod}"`,
        );
        continue;
      }

      if (!row.concept || row.concept.trim().length === 0) {
        errors.push(`Fila ${lineNum}: Concepto vacío`);
        continue;
      }

      if (!row.miscCatalogId && !row.chargeGroupId) {
        errors.push(
          `Fila ${lineNum}: Debe tener al menos una Categoría o Tipo de cuota`,
        );
        continue;
      }

      if (row.miscCatalogId && !validCatalogs.has(row.miscCatalogId)) {
        errors.push(`Fila ${lineNum}: ID Categoría no encontrado`);
        continue;
      }

      if (row.chargeGroupId && !validGroups.has(row.chargeGroupId)) {
        errors.push(`Fila ${lineNum}: ID Tipo de cuota no encontrado`);
        continue;
      }

      validRows.push({
        condominiumId: condo.id,
        date: new Date(row.date),
        amount: row.amount,
        concept: row.concept.trim(),
        paymentMethod: method as any,
        notes: row.notes?.trim() || null,
        miscCatalogId: row.miscCatalogId || null,
        chargeGroupId: row.chargeGroupId || null,
        isActive: true,
        isConfirmed: false,
      });
    }

    if (validRows.length > 0) {
      await prisma.income.createMany({ data: validRows });
    }

    revalidatePath("/listado-ingresos");

    return {
      success: true,
      imported: validRows.length,
      errors,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
