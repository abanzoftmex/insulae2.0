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

    const rowsToImport: {
      budgetConceptId: string;
      conceptName: string;
      budgetGroup: string;
      unitCost: number | null;
      supplierUrl: string | null;
      monthsData: { month: number; amount: number; units: number | null }[];
    }[] = [];

    // Empezar desde 1 para ignorar cabeceras. (Puede que tengan multi cabeceras, buscamos primera fila con ID valido)
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const rawIdValue = row[0];
      let concept: any;

      if (typeof rawIdValue === 'string' && rawIdValue.length > 20) {
        concept = conceptMapById.get(rawIdValue);
      } else {
        const rawId = parseInt(rawIdValue);
        if (!isNaN(rawId)) {
          const conceptId = conceptMapByLegacy.get(rawId);
          if (conceptId) concept = conceptMapById.get(conceptId);
        } else {
          continue; // Cabecera o titulo
        }
      }

      if (!concept) {
        errors.push(`Fila ${i+1}: El concepto '${rawIdValue}' no existe para el año ${year} o está inactivo en base de datos Neon.`);
        continue;
      }

      // Procesar Costo Unitario
      let unitCost: number | null = null;
      if (row[2] !== undefined && row[2] !== null && row[2] !== "") {
        const parsed = parseFloat(row[2]);
        if (!isNaN(parsed) && parsed >= 0) {
          unitCost = parsed;
        }
      }

      // Procesar Proveedor
      let supplierUrl: string | null = null;
      if (row[3] !== undefined && row[3] !== null) {
        const val = String(row[3]).trim();
        if (val) {
          supplierUrl = val;
        }
      }

      // Procesar 12 meses
      const monthsData = [];
      for (let m = 1; m <= 12; m++) {
        const amtIdx = 4 + (m - 1) * 2;
        const unitIdx = 5 + (m - 1) * 2;

        let amount = parseFloat(row[amtIdx]);
        if (isNaN(amount) || amount < 0) {
          amount = 0; // fallback para vacios
        }

        let units: number | null = null;
        if (row[unitIdx] !== undefined && row[unitIdx] !== null && row[unitIdx] !== "") {
          const parsed = parseFloat(row[unitIdx]);
          if (!isNaN(parsed) && parsed >= 0) {
            units = parsed;
          }
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
