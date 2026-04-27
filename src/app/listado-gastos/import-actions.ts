"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/db/prisma";

interface ImportRow {
  budgetConceptId?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  concept: string;
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
    if (!condo) return { success: false, error: "No condominium found" };

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
      budgetConceptId: string | null;
      isActive: boolean;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // header is line 1

      if (!row.date || isNaN(Date.parse(row.date))) {
        errors.push(`Fila ${lineNum}: Fecha inválida`);
        continue;
      }

      if (!row.amount || row.amount <= 0 || isNaN(row.amount)) {
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

      if (!row.concept || String(row.concept).trim().length === 0) {
        errors.push(`Fila ${lineNum}: Detalles del gasto (Concepto) vacío`);
        continue;
      }

      if (!row.budgetConceptId) {
        errors.push(`Fila ${lineNum}: Debe tener un ID Concepto`);
        continue;
      }

      const resolvedId = conceptMap.get(String(row.budgetConceptId).trim());
      if (!resolvedId) {
        errors.push(`Fila ${lineNum}: ID Concepto no encontrado o inactivo`);
        continue;
      }

      validRows.push({
        condominiumId: condo.id,
        date: new Date(row.date),
        amount: Number(row.amount),
        concept: String(row.concept).trim(),
        paymentMethod: method as any,
        notes: row.notes?.trim() || null,
        projectName: row.projectName?.trim() || null,
        budgetConceptId: resolvedId,
        isActive: true,
      });
    }

    if (validRows.length > 0) {
      await prisma.expense.createMany({ data: validRows });
    }

    revalidatePath("/listado-gastos");

    return {
      success: true,
      imported: validRows.length,
      errors,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
