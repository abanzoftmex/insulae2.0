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

    // Fetch all active catalogs and groups to resolve IDs or Legacy IDs
    const [dbCatalogs, dbGroups] = await Promise.all([
      prisma.miscIncomeCatalog.findMany({
        where: { condominiumId: condo.id, isActive: true },
        select: { id: true, legacyId: true },
      }),
      prisma.chargeGroup.findMany({
        where: { condominiumId: condo.id, isActive: true },
        select: { id: true, legacyId: true },
      }),
    ]);

    const catalogMap = new Map<string, string>(); // input -> uuid
    dbCatalogs.forEach((c) => {
      catalogMap.set(c.id, c.id);
      if (c.legacyId != null) catalogMap.set(String(c.legacyId), c.id);
    });

    const groupMap = new Map<string, string>(); // input -> uuid
    dbGroups.forEach((g) => {
      groupMap.set(g.id, g.id);
      if (g.legacyId != null) groupMap.set(String(g.legacyId), g.id);
    });

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

      const resolvedCatalogId = row.miscCatalogId
        ? catalogMap.get(String(row.miscCatalogId).trim())
        : null;
      const resolvedGroupId = row.chargeGroupId
        ? groupMap.get(String(row.chargeGroupId).trim())
        : null;

      if (!resolvedCatalogId && !resolvedGroupId) {
        errors.push(
          `Fila ${lineNum}: ID Categoría o Tipo de cuota no encontrado o no especificado`,
        );
        continue;
      }

      validRows.push({
        condominiumId: condo.id,
        date: new Date(row.date),
        amount: row.amount,
        concept: row.concept.trim(),
        paymentMethod: method as any,
        notes: row.notes?.trim() || null,
        miscCatalogId: resolvedCatalogId || null,
        chargeGroupId: resolvedGroupId || null,
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
