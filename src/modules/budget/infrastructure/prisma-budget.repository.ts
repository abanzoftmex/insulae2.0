import { PrismaClient, BudgetStatus } from "@prisma/client";
import { BudgetRepository } from "../domain/budget.repository";
import { BudgetVM, BudgetGroupVM as BudgetOverviewGroupVM, BudgetConceptRowVM, BudgetMonthVM } from "../domain/budget.types";
import { BudgetStructureVM, BudgetGroupVM } from "../domain/budget-structure.types";
import { prisma } from "../../../shared/infrastructure/db/prisma";

export class PrismaBudgetRepository implements BudgetRepository {
  
  async getBudget(condominiumId: string, year: number): Promise<BudgetVM> {
    const budget = await prisma.budget.findUnique({
      where: { condominiumId_year: { condominiumId, year } },
      include: {
        lines: {
          include: { months: true }
        }
      }
    });

    const activeConcepts = await prisma.budgetExpenseConcept.findMany({
      where: { condominiumId, year, isActive: true },
      include: { group: true },
      orderBy: [
        { group: { order: 'asc' } },
        { order: 'asc' }
      ]
    });

    const expenses = await prisma.expense.groupBy({
      by: ['budgetConceptId'],
      where: {
        condominiumId,
        isActive: true,
        date: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00Z`)
        }
      },
      _sum: { amount: true }
    });
    
    // Para gastos por mes necesitamos raw o consultar todos y agrupar
    // Es mas facil traer todos los expenses del año reducidos
    const allExpenses = await prisma.expense.findMany({
      where: {
        condominiumId,
        isActive: true,
        date: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00Z`)
        }
      },
      select: { budgetConceptId: true, amount: true, date: true }
    });

    // Hash maps para lookup O(1)
    const expenseSumMap = new Map<string, number>(); // key: conceptId + '_' + month
    for (const exp of allExpenses) {
      if (!exp.budgetConceptId) continue;
      const m = exp.date.getUTCMonth() + 1;
      const key = `${exp.budgetConceptId}_${m}`;
      const prev = expenseSumMap.get(key) ?? 0;
      expenseSumMap.set(key, prev + exp.amount.toNumber());
    }

    const lineMapByConcept = new Map(budget?.lines.map(l => [l.budgetConceptId, l]));

    // Agrupacion: un bloque por cada BudgetGroup real. Guardamos el nombre
    // principal (name) y el subnombre (category) por separado para mostrarlos
    // como en la pantalla de estructura presupuestal.
    const groupsMap = new Map<string, { name: string; subname: string; order: number; concepts: BudgetConceptRowVM[] }>();

    let globalBudgeted = 0;
    let globalGenerated = 0;
    let extraBudgeted = 0;
    let extraGenerated = 0;

    for (const concept of activeConcepts) {
      const line = lineMapByConcept.get(concept.id);
      
      let conceptBudgeted = 0;
      let conceptGenerated = 0;
      const months: BudgetMonthVM[] = [];

      for (let m = 1; m <= 12; m++) {
        const matchingMonth = line?.months.find(x => x.month === m);
        const budgetedVal = matchingMonth ? matchingMonth.amount.toNumber() : 0;
        const generatedVal = expenseSumMap.get(`${concept.id}_${m}`) ?? 0;

        conceptBudgeted += budgetedVal;
        conceptGenerated += generatedVal;

        months.push({
          month: m,
          budgetMonthId: matchingMonth?.id,
          budgeted: budgetedVal,
          generated: generatedVal,
          units: matchingMonth?.units ? matchingMonth.units.toNumber() : null
        });
      }

      if (concept.budgetGroup !== "EXTRAORDINARY") {
        globalBudgeted += conceptBudgeted;
        globalGenerated += conceptGenerated;
      } else {
        extraBudgeted += conceptBudgeted;
        extraGenerated += conceptGenerated;
      }

      const row: BudgetConceptRowVM = {
        conceptId: concept.id,
        conceptName: concept.name,
        legacyConceptId: concept.legacyBudgetConceptId,
        budgetLineId: line?.id,
        unitCost: line?.unitCost ? line.unitCost.toNumber() : null,
        supplierUrl: line?.supplierUrl ?? null,
        budgeted: conceptBudgeted,
        generated: conceptGenerated,
        balance: conceptBudgeted - conceptGenerated,
        months
      };

      // Clave por identidad del grupo (id) para que cada BudgetGroup sea su
      // propio bloque, sin importar que distintos grupos compartan el mismo
      // name (p.ej. "Presupuesto ordinario" en Sassi) o el mismo category
      // (p.ej. "OTHER" en insulae). Mostramos name como principal y category
      // como subnombre.
      const grp = concept.group;
      const groupKey = grp?.id || concept.budgetGroup || "OTHER";
      const groupName = grp?.name || concept.budgetGroup || "OTHER";
      const groupSubname = grp?.category ?? "";
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, { name: groupName, subname: groupSubname, order: grp?.order ?? 0, concepts: [] });
      }
      groupsMap.get(groupKey)?.concepts.push(row);
    }

    const groups: BudgetOverviewGroupVM[] = [];
    for (const [groupId, g] of groupsMap.entries()) {
      const gBudgeted = g.concepts.reduce((acc, c) => acc + c.budgeted, 0);
      const gGenerated = g.concepts.reduce((acc, c) => acc + c.generated, 0);
      const gBalance = gBudgeted - gGenerated;

      // Mostramos siempre el subnombre (category), igual que en Sassi, aunque
      // sea "OTHER" (caso de insulae). Ambos sistemas se comportan idéntico:
      // nombre principal (name) + subnombre (category). Solo se omite si el
      // subnombre viene vacío o es idéntico al principal (evita duplicarlo).
      const subname = g.subname && g.subname !== g.name ? g.subname : undefined;

      groups.push({
        groupId,
        groupData: g.name,
        groupSubname: subname,
        budgeted: gBudgeted,
        generated: gGenerated,
        balance: gBalance,
        concepts: g.concepts
      });
    }

    groups.sort((a, b) => {
      const orderA = groupsMap.get(a.groupId)?.order ?? 0;
      const orderB = groupsMap.get(b.groupId)?.order ?? 0;
      return orderA - orderB;
    });

    return {
      id: budget?.id,
      condominiumId,
      year,
      status: budget?.status ?? BudgetStatus.OPEN,
      totalBudgeted: globalBudgeted,
      totalGenerated: globalGenerated,
      totalBalance: globalBudgeted - globalGenerated,
      // Un card por cada grupo presupuestal real (BudgetGroup) creado en
      // /listado-estructura-presupuesto, en el mismo orden que la tabla.
      summaryCards: groups.map(g => ({
        title: g.groupData,
        subtitle: g.groupSubname,
        budgeted: g.budgeted,
        generated: g.generated
      })),
      groups
    };
  }

  async createBudgetIfNotExists(condominiumId: string, year: number): Promise<string> {
    const existing = await prisma.budget.findUnique({
      where: { condominiumId_year: { condominiumId, year } }
    });
    if (existing) return existing.id;
    const n = await prisma.budget.create({
      data: { condominiumId, year, status: BudgetStatus.OPEN }
    });
    return n.id;
  }

  async updateMonthAmount(budgetMonthId: string, amount: number): Promise<void> {
    await prisma.budgetMonth.update({
      where: { id: budgetMonthId },
      data: { amount }
    });
  }

  async updateUnitCost(budgetId: string, budgetConceptId: string, unitCost: number): Promise<void> {
    let line = await prisma.budgetLine.findFirst({
      where: { budgetId, budgetConceptId }
    });

    if (!line) {
      const concept = await prisma.budgetExpenseConcept.findUnique({ where: { id: budgetConceptId } });
      line = await prisma.budgetLine.create({
        data: {
          budgetId,
          budgetConceptId,
          concept: concept?.name ?? "Unknown Concept",
          groupName: concept?.budgetGroup ?? "OTHER",
          unitCost
        }
      });
    } else {
      await prisma.budgetLine.update({
        where: { id: line.id },
        data: { unitCost }
      });
    }

    // Recalcular monto de presupuesto para todos los meses que tengan unidades definidas
    const months = await prisma.budgetMonth.findMany({
      where: { budgetLineId: line.id }
    });
    for (const m of months) {
      if (m.units !== null) {
        const newAmount = unitCost * m.units.toNumber();
        await prisma.budgetMonth.update({
          where: { id: m.id },
          data: { amount: newAmount }
        });
      }
    }
  }

  async updateSupplierUrl(budgetId: string, budgetConceptId: string, supplierUrl: string | null): Promise<void> {
    let line = await prisma.budgetLine.findFirst({
      where: { budgetId, budgetConceptId }
    });

    if (!line) {
      const concept = await prisma.budgetExpenseConcept.findUnique({ where: { id: budgetConceptId } });
      line = await prisma.budgetLine.create({
        data: {
          budgetId,
          budgetConceptId,
          concept: concept?.name ?? "Unknown Concept",
          groupName: concept?.budgetGroup ?? "OTHER",
          supplierUrl
        }
      });
    } else {
      await prisma.budgetLine.update({
        where: { id: line.id },
        data: { supplierUrl }
      });
    }
  }

  async updateMonthUnits(budgetId: string, budgetConceptId: string, month: number, units: number): Promise<void> {
    let line = await prisma.budgetLine.findFirst({
      where: { budgetId, budgetConceptId }
    });

    if (!line) {
      const concept = await prisma.budgetExpenseConcept.findUnique({ where: { id: budgetConceptId } });
      line = await prisma.budgetLine.create({
        data: {
          budgetId,
          budgetConceptId,
          concept: concept?.name ?? "Unknown Concept",
          groupName: concept?.budgetGroup ?? "OTHER"
        }
      });
    }

    const existingMonth = await prisma.budgetMonth.findUnique({
      where: { budgetLineId_month: { budgetLineId: line.id, month } }
    });

    const unitCost = line.unitCost ? line.unitCost.toNumber() : 0;
    
    if (existingMonth) {
      const newAmount = unitCost > 0 ? unitCost * units : existingMonth.amount.toNumber();
      await prisma.budgetMonth.update({
        where: { id: existingMonth.id },
        data: { units, amount: newAmount }
      });
    } else {
      const newAmount = unitCost > 0 ? unitCost * units : 0;
      await prisma.budgetMonth.create({
        data: { budgetLineId: line.id, month, amount: newAmount, units }
      });
    }
  }

  async createMonthAmount(budgetId: string, budgetConceptId: string, month: number, amount: number): Promise<void> {
    // Buscar si ya hay un BudgetLine para este concept
    let line = await prisma.budgetLine.findFirst({
      where: { budgetId, budgetConceptId }
    });
    
    if (!line) {
      const concept = await prisma.budgetExpenseConcept.findUnique({ where: { id: budgetConceptId }});
      line = await prisma.budgetLine.create({
        data: {
          budgetId,
          budgetConceptId,
          concept: concept?.name ?? "Unknown Concept",
          groupName: concept?.budgetGroup ?? "OTHER"
        }
      });
    }

    // Verificar month
    const existingMonth = await prisma.budgetMonth.findUnique({
      where: { budgetLineId_month: { budgetLineId: line.id, month } }
    });

    if (existingMonth) {
      await prisma.budgetMonth.update({
        where: { id: existingMonth.id },
        data: { amount }
      });
    } else {
      await prisma.budgetMonth.create({
        data: { budgetLineId: line.id, month, amount }
      });
    }
  }

  async upsertBudgetLineMonths(budgetId: string, budgetConceptId: string, monthsData: {month: number, amount: number}[]): Promise<void> {
    let line = await prisma.budgetLine.findFirst({
      where: { budgetId, budgetConceptId }
    });
    
    if (!line) {
      const concept = await prisma.budgetExpenseConcept.findUnique({ where: { id: budgetConceptId }});
      line = await prisma.budgetLine.create({
        data: {
          budgetId,
          budgetConceptId,
          concept: concept?.name ?? "Unknown Concept",
          groupName: concept?.budgetGroup ?? "OTHER"
        }
      });
    }

    const existingMonths = await prisma.budgetMonth.findMany({
      where: { budgetLineId: line.id }
    });
    const existingMap = new Map(existingMonths.map(m => [m.month, m]));

    const ops = [];
    for (const { month, amount } of monthsData) {
      const existing = existingMap.get(month);
      if (existing) {
        ops.push(prisma.budgetMonth.update({
          where: { id: existing.id },
          data: { amount }
        }));
      } else {
        ops.push(prisma.budgetMonth.create({
          data: { budgetLineId: line.id, month, amount }
        }));
      }
    }
    await prisma.$transaction(ops);
  }

  async bulkImportBudgetMonths(
    budgetId: string,
    rows: {
      budgetConceptId: string;
      conceptName: string;
      budgetGroup: string;
      unitCost: number | null;
      supplierUrl: string | null;
      monthsData: { month: number; amount: number; units: number | null }[];
    }[]
  ): Promise<void> {
    if (rows.length === 0) return;

    // 1. Fetch all existing budget lines for this budget
    const existingLines = await prisma.budgetLine.findMany({ where: { budgetId } });
    const lineMapByConcept = new Map(existingLines.map(l => [l.budgetConceptId, l]));

    // 2. Identify missing lines and create them in bulk
    const missingLinesData = rows
      .filter(r => !lineMapByConcept.has(r.budgetConceptId))
      .map(r => ({
        budgetId,
        budgetConceptId: r.budgetConceptId,
        concept: r.conceptName,
        groupName: r.budgetGroup,
        unitCost: r.unitCost,
        supplierUrl: r.supplierUrl
      }));

    if (missingLinesData.length > 0) {
      await prisma.budgetLine.createMany({ data: missingLinesData });
    }

    // Update existing lines if unitCost or supplierUrl has changed
    const lineUpdates = [];
    for (const r of rows) {
      const existing = lineMapByConcept.get(r.budgetConceptId);
      if (existing) {
        if (existing.unitCost !== r.unitCost || existing.supplierUrl !== r.supplierUrl) {
          lineUpdates.push(prisma.budgetLine.update({
            where: { id: existing.id },
            data: { unitCost: r.unitCost, supplierUrl: r.supplierUrl }
          }));
        }
      }
    }
    if (lineUpdates.length > 0) {
      await Promise.all(lineUpdates);
    }

    // 3. Refetch lines to get all IDs
    const allLines = await prisma.budgetLine.findMany({ where: { budgetId } });
    const fullLineMapByConcept = new Map(allLines.map(l => [l.budgetConceptId, l]));

    // 4. Fetch all existing budget months for this budget
    const lineIds = allLines.map(l => l.id);
    const existingMonths = await prisma.budgetMonth.findMany({ where: { budgetLineId: { in: lineIds } } });
    const monthMap = new Map();
    for (const m of existingMonths) {
      monthMap.set(`${m.budgetLineId}_${m.month}`, m);
    }

    // 5. Prepare operations
    const creates: any[] = [];
    const updates: any[] = [];

    for (const r of rows) {
      const line = fullLineMapByConcept.get(r.budgetConceptId);
      if (!line) continue;
      for (const m of r.monthsData) {
        const existing = monthMap.get(`${line.id}_${m.month}`);
        if (existing) {
          if (existing.amount !== m.amount || existing.units !== m.units) {
            updates.push({ id: existing.id, amount: m.amount, units: m.units });
          }
        } else {
          creates.push({ budgetLineId: line.id, month: m.month, amount: m.amount, units: m.units });
        }
      }
    }

    // 6. Execute operations
    if (creates.length > 0) {
      await prisma.budgetMonth.createMany({ data: creates });
    }

    const CHUNK_SIZE = 50;
    for(let i=0; i<updates.length; i+=CHUNK_SIZE) {
      const chunk = updates.slice(i, i+CHUNK_SIZE);
      await Promise.all(
        chunk.map(u => prisma.budgetMonth.update({
          where: { id: u.id },
          data: { amount: u.amount, units: u.units }
        }))
      );
    }
  }

  async toggleBudgetStatus(budgetId: string): Promise<void> {
    const b = await prisma.budget.findUniqueOrThrow({ where: { id: budgetId } });
    await prisma.budget.update({
      where: { id: budgetId },
      data: { status: b.status === BudgetStatus.OPEN ? BudgetStatus.CLOSED : BudgetStatus.OPEN }
    });
  }

  async getBudgetStructure(condominiumId: string, year: number): Promise<BudgetStructureVM> {
    const groups = await prisma.budgetGroup.findMany({
      where: { condominiumId, year, isActive: true },
      include: {
        concepts: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return {
      year,
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        year: g.year,
        category: g.category,
        isActive: g.isActive,
        concepts: g.concepts.map(c => ({
          id: c.id,
          name: c.name,
          order: c.order,
          type: c.type,
          isActive: c.isActive
        }))
      }))
    };
  }

  async getBudgetGroupById(id: string): Promise<any> {
    return prisma.budgetGroup.findUnique({
      where: { id },
      include: {
        concepts: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  async getCondominiumBudgetGroups(condominiumId: string, year: number): Promise<any[]> {
    return prisma.budgetGroup.findMany({
      where: { condominiumId, year, isActive: true },
      orderBy: { order: 'asc' }
    });
  }

  async saveBudgetGroup(data: any): Promise<void> {
    const { id, concepts, ...rest } = data;

    if (id) {
      // Update
      await prisma.budgetGroup.update({
        where: { id },
        data: rest
      });

      // Update concepts
      for (const concept of concepts) {
        if (concept.id) {
          await prisma.budgetExpenseConcept.update({
            where: { id: concept.id },
            data: {
              name: concept.name,
              order: concept.order,
              type: concept.type,
              isActive: concept.isActive ?? true
            }
          });
        } else {
          await prisma.budgetExpenseConcept.create({
            data: {
              ...concept,
              budgetGroupId: id,
              condominiumId: rest.condominiumId,
              year: rest.year
            }
          });
        }
      }
    } else {
      // Create
      await this.createBudgetIfNotExists(rest.condominiumId, rest.year);
      const newGroup = await prisma.budgetGroup.create({
        data: {
          name: rest.name,
          category: rest.category,
          order: rest.order || 0,
          isActive: rest.isActive ?? true,
          condominium: { connect: { id: rest.condominiumId } },
          budget: { connect: { condominiumId_year: { condominiumId: rest.condominiumId, year: rest.year } } },
          concepts: {
            create: concepts.map((c: any) => ({
              name: c.name,
              order: c.order || 0,
              type: c.type || "N/A",
              isActive: c.isActive ?? true,
              condominiumId: rest.condominiumId,
              year: rest.year
            }))
          }
        }
      });
    }
  }

  async deleteBudgetGroup(groupId: string): Promise<void> {
    await prisma.budgetGroup.update({
      where: { id: groupId },
      data: { isActive: false }
    });
  }

  async deleteBudgetConcept(conceptId: string): Promise<void> {
    await prisma.budgetExpenseConcept.update({
      where: { id: conceptId },
      data: { isActive: false }
    });
  }
}
