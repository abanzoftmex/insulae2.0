"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/db/prisma";

interface ImportRow {
  budgetConceptId?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  concept: string; // Map to comments or details
  receipt?: string;
  projectName?: string;
  notes?: string;
}

const VALID_METHODS = new Set(["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"]);

export async function importExpensesAction(rows: ImportRow[]) {
  try {
    const condo = await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!condo) return { success: false, errors: ["No condominium found"] };

    const allConcepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condo.id, isActive: true },
      select: { id: true, legacyBudgetConceptId: true },
    });

    const conceptMap = new Map<string, string>();
    allConcepts.forEach((c) => {
      conceptMap.set(c.id, c.id);
      if (c.legacyBudgetConceptId != null) {
        conceptMap.set(String(c.legacyBudgetConceptId), c.id);
      }
    });

    const errors: string[] = [];
    const validRows: Array<{
      condominiumId: string;
      date: Date;
      amount: number;
      concept: string;
      paymentMethod: any;
      notes: string | null;
      projectName: string | null;
      legacyReceipt: string | null;
      budgetConceptId: string | null;
      isActive: boolean;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // header is line 1

      // Handle Excel dates or string dates
      let finalDate: Date;
      if (!row.date) {
        errors.push("Fila " + lineNum + ": Fecha vacía");
        continue;
      }
      
      const parsedDate = new Date(row.date);
      if (isNaN(parsedDate.getTime())) {
        errors.push("Fila " + lineNum + ": Fecha inválida " + row.date);
        continue;
      }
      finalDate = parsedDate;

      if (row.amount === undefined || isNaN(row.amount)) {
        errors.push("Fila " + lineNum + ": Monto inválido");
        continue;
      }

      const method = (row.paymentMethod || "").toUpperCase().trim();
      if (!VALID_METHODS.has(method)) {
        errors.push(
          "Fila " + lineNum + ": Forma de pago inválida " + row.paymentMethod
        );
        continue;
      }

      if (!row.concept || String(row.concept).trim().length === 0) {
        errors.push("Fila " + lineNum + ": Comentarios/Concepto vacío");
        continue;
      }

      if (!row.budgetConceptId) {
        errors.push("Fila " + lineNum + ": El campo id_concepto es obligatorio");
        continue;
      }

      const resolvedId = conceptMap.get(String(row.budgetConceptId).trim());
      if (!resolvedId) {
        errors.push("Fila " + lineNum + ": El ID Concepto " + row.budgetConceptId + " no existe en el catálogo.");
        continue;
      }

      validRows.push({
        condominiumId: condo.id,
        date: finalDate,
        amount: Number(row.amount),
        concept: String(row.concept).trim(),
        paymentMethod: method as any,
        notes: row.notes?.trim() || null,
        projectName: row.projectName?.trim() || null,
        legacyReceipt: row.receipt?.trim() || null,
        budgetConceptId: resolvedId,
        isActive: true,
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    if (validRows.length > 0) {
      await prisma.expense.createMany({
        data: validRows,
      });
    }

    revalidatePath("/listado-gastos");

    return { 
      success: true, 
      imported: validRows.length 
    };
  } catch (error: any) {
    console.error("Error importing expenses:", error);
    return { success: false, errors: [error.message] };
  }
}
