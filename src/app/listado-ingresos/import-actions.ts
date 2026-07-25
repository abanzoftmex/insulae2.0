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

function parseExcelDate(val: any): Date | null {
  if (val == null || val === "") return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  // Handle Excel serial number (e.g., 45650)
  if (typeof val === "number" || (typeof val === "string" && /^\d{5}(\.\d+)?$/.test(val.trim()))) {
    const num = typeof val === "number" ? val : parseFloat(val.trim());
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Try standard Date parsing
  const dStandard = new Date(str);
  if (!isNaN(dStandard.getTime())) return dStandard;

  // Try DD-MMM-YY / DD-MMM-YYYY (e.g., "24-Dec-24", "24-Dec-2024")
  const monthMap: Record<string, number> = {
    jan: 0, ene: 0,
    feb: 1,
    mar: 2,
    apr: 3, abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7, ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11, dic: 11,
  };

  const regexDmmmyy = /^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{2,4})$/;
  const matchDmmmyy = str.match(regexDmmmyy);
  if (matchDmmmyy) {
    const day = parseInt(matchDmmmyy[1], 10);
    const mStr = matchDmmmyy[2].toLowerCase();
    let year = parseInt(matchDmmmyy[3], 10);
    if (year < 100) year += 2000;
    const month = monthMap[mStr];
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const regexDmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/;
  const matchDmy = str.match(regexDmy);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    let year = parseInt(matchDmy[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day));
  }

  return null;
}

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

      const parsedDate = parseExcelDate(row.date);
      if (!parsedDate) {
        errors.push(`Fila ${lineNum}: Fecha inválida "${row.date}"`);
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
        date: parsedDate,
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
    revalidatePath("/resumen-financiero");

    return {
      success: true,
      imported: validRows.length,
      errors,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
