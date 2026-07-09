import { read, utils } from "xlsx";
import { BudgetRepository } from "../../domain/budget.repository";
import { prisma } from "../../../../shared/infrastructure/db/prisma";

export class ImportBudgetFromExcelUseCase {
  constructor(private readonly repo: BudgetRepository) {}

  async execute(condominiumId: string, year: number, buffer: Buffer): Promise<{ totalImported: number, errors: string[] }> {
    // Verificar que este budget esta abierto
    const budget = await this.repo.getBudget(condominiumId, year);
    if (budget.status !== "OPEN") {
      throw new Error("El presupuesto de este año está cerrado. Desbloquéalo primero para importar.");
    }
    
    if (!budget.id) {
       throw new Error("El presupuesto no se pudo inicializar debidamente.");
    }

    const workbook = read(buffer);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Leer como grid 2D. 
    const data: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
    
    const errors: string[] = [];
    let totalImported = 0;

    // Obtener un diccionario de legacy => id neon para los conceptos de este condominio
    const activeConcepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId, year, isActive: true },
      select: { id: true, legacyBudgetConceptId: true, name: true, budgetGroup: true }
    });

    const conceptMapByLegacy = new Map(
      activeConcepts
        .filter(c => c.legacyBudgetConceptId !== null)
        .map(c => [c.legacyBudgetConceptId, c.id])
    );
    
    const conceptMapById = new Map(
      activeConcepts.map(c => [c.id, c])
    );

    // Obtener las líneas de presupuesto actuales para rellenar los valores por defecto si no vienen en el Excel
    const existingLines = await prisma.budgetLine.findMany({
      where: { budgetId: budget.id }
    });
    const lineMapByConceptId = new Map(existingLines.map(l => [l.budgetConceptId, l]));

    const headers = data[0];
    if (!headers || headers.length === 0) {
      throw new Error("El archivo de Excel no contiene cabeceras válidas.");
    }

    let conceptIdIdx = 0;
    let unitCostIdx = -1;
    let supplierIdx = -1;
    const amountIndices: Record<number, number> = {};
    const unitsIndices: Record<number, number> = {};

    const monthAbbrevs = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    for (let col = 0; col < headers.length; col++) {
      const headerVal = String(headers[col] || "").trim().toLowerCase();
      if (!headerVal) continue;

      if (headerVal === "id" || headerVal.startsWith("id ") || headerVal.endsWith(" id") || headerVal === "id concepto") {
        conceptIdIdx = col;
      } else if (headerVal.includes("unitario")) {
        unitCostIdx = col;
      } else if (headerVal.includes("proveedor")) {
        supplierIdx = col;
      } else {
        for (let m = 1; m <= 12; m++) {
          const abbrev = monthAbbrevs[m - 1];
          if (headerVal.includes(abbrev)) {
            if (headerVal.includes("unidad")) {
              unitsIndices[m] = col;
            } else if (headerVal.includes("presupuesto") || headerVal === abbrev) {
              amountIndices[m] = col;
            } else {
              amountIndices[m] = col;
            }
            break;
          }
        }
      }
    }

    const rowsToImport: {
      budgetConceptId: string;
      conceptName: string;
      budgetGroup: string;
      unitCost: number | null;
      supplierUrl: string | null;
      monthsData: { month: number; amount: number; units: number | null }[];
    }[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const rawIdValue = row[conceptIdIdx];
      if (rawIdValue === undefined || rawIdValue === null || String(rawIdValue).trim() === "") continue;
      
      let concept: any;
      const idStr = String(rawIdValue).trim();

      if (idStr.length > 20) {
        concept = conceptMapById.get(idStr);
      } else {
        // 1. Intentamos buscar por prefijo de UUID (para UUIDs truncados en Excel)
        if (idStr.length >= 8) {
          const matchingConcept = activeConcepts.find(c => c.id.toLowerCase().startsWith(idStr.toLowerCase()));
          if (matchingConcept) {
            concept = matchingConcept;
          }
        }
        
        // 2. Si no se encontró por prefijo, intentamos por ID Legacy
        if (!concept) {
          const rawId = parseInt(idStr, 10);
          if (!isNaN(rawId)) {
            const conceptId = conceptMapByLegacy.get(rawId);
            if (conceptId) concept = conceptMapById.get(conceptId);
          }
        }
      }

      if (!concept) {
        const rowName = row[1] ? ` (${row[1]})` : "";
        errors.push(`Fila ${i+1}${rowName}: No se encontró un concepto activo con el ID '${rawIdValue}' para el año ${year}.`);
        continue;
      }

      const existingLine = lineMapByConceptId.get(concept.id);

      // Procesar Costo Unitario
      let unitCost: number | null = existingLine?.unitCost ? existingLine.unitCost.toNumber() : null;
      if (unitCostIdx !== -1) {
        if (row[unitCostIdx] !== undefined && row[unitCostIdx] !== null && row[unitCostIdx] !== "") {
          const parsed = parseFloat(row[unitCostIdx]);
          unitCost = !isNaN(parsed) && parsed >= 0 ? parsed : null;
        } else {
          unitCost = null;
        }
      }

      // Procesar Proveedor
      let supplierUrl: string | null = existingLine?.supplierUrl ?? null;
      if (supplierIdx !== -1) {
        if (row[supplierIdx] !== undefined && row[supplierIdx] !== null) {
          supplierUrl = String(row[supplierIdx]).trim() || null;
        } else {
          supplierUrl = null;
        }
      }

      // Procesar los meses
      const monthsData = [];
      for (let m = 1; m <= 12; m++) {
        const amtIdx = amountIndices[m];
        const unitIdx = unitsIndices[m];

        if (amtIdx === undefined && unitIdx === undefined) {
          continue;
        }

        let amount = 0;
        if (amtIdx !== undefined && row[amtIdx] !== undefined && row[amtIdx] !== null && row[amtIdx] !== "") {
          const parsed = parseFloat(row[amtIdx]);
          if (!isNaN(parsed) && parsed >= 0) {
            amount = parsed;
          }
        }

        let units: number | null = null;
        if (unitIdx !== undefined && row[unitIdx] !== undefined && row[unitIdx] !== null && row[unitIdx] !== "") {
          const parsed = parseFloat(row[unitIdx]);
          if (!isNaN(parsed) && parsed >= 0) {
            units = parsed;
          }
        }

        // Si tenemos costo unitario y unidades definidas, calculamos el presupuesto automáticamente si no se especificó un monto
        if (amount === 0 && unitCost !== null && units !== null) {
          amount = unitCost * units;
        }

        monthsData.push({ month: m, amount, units });
      }
      
      rowsToImport.push({
        budgetConceptId: concept.id,
        conceptName: concept.name,
        budgetGroup: concept.budgetGroup ?? "OTHER",
        unitCost,
        supplierUrl,
        monthsData
      });
      totalImported++;
    }

    // Ejecutar todo en un solo mega-bloque
    await this.repo.bulkImportBudgetMonths(budget.id, rowsToImport);

    return { totalImported, errors };
  }
}
