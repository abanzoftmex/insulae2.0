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
    // Cabeceras esperadas:
    // 0: ID Concepto | 1: Concepto | 2: mes1 | 3: mes2 ... 13: mes12
    const data: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
    
    const errors: string[] = [];
    let totalImported = 0;

    // Obtener un diccionario de legacy => id neon para los conceptos de este condominio
    const activeConcepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId, year, isActive: true },
      select: { id: true, legacyBudgetConceptId: true, name: true }
    });

    const conceptMapByLegacy = new Map(
      activeConcepts
        .filter(c => c.legacyBudgetConceptId !== null)
        .map(c => [c.legacyBudgetConceptId, c.id])
    );

    // Empezar desde 1 para ignorar cabeceras. (Puede que tengan multi cabeceras, buscamos primera fila con ID valido)
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const rawId = parseInt(row[0]);
      if (isNaN(rawId)) continue; // Si no es un numero de "ID Concepto", debe ser titulo o cabecera

      const conceptId = conceptMapByLegacy.get(rawId);
      if (!conceptId) {
        errors.push(`Fila ${i+1}: El concepto con ID legacy '${rawId}' no existe para el año ${year} o está inactivo en base de datos Neon.`);
        continue;
      }

      // Procesar 12 meses (A partir de la columna 2)
      for (let m = 1; m <= 12; m++) {
        const index = m + 1; // 2 para enero, 3 para febrero...
        let amount = parseFloat(row[index]);
        if (isNaN(amount) || amount < 0) {
          amount = 0; // fallback para vacios
        }
        
        await this.repo.createMonthAmount(budget.id, conceptId, m, amount);
      }
      
      totalImported++;
    }

    return { totalImported, errors };
  }
}
