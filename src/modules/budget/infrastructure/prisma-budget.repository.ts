import { PrismaClient, BudgetStatus, ExpenseBudgetGroup } from "@prisma/client";
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
      orderBy: { name: 'asc' }
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

    // Agrupacion
    const groupsMap = new Map<ExpenseBudgetGroup, BudgetConceptRowVM[]>();
    for (const group of Object.keys(ExpenseBudgetGroup) as ExpenseBudgetGroup[]) {
      groupsMap.set(group, []);
    }

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
          generated: generatedVal
        });
      }

      if (concept.budgetGroup !== ExpenseBudgetGroup.EXTRAORDINARY) {
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
        budgeted: conceptBudgeted,
        generated: conceptGenerated,
        balance: conceptBudgeted - conceptGenerated,
        months
      };

      groupsMap.get(concept.budgetGroup)?.push(row);
    }

    const groups: BudgetOverviewGroupVM[] = [];
    for (const [groupKey, concepts] of groupsMap.entries()) {
      if (concepts.length === 0) continue;
      const budgeted = concepts.reduce((s, c) => s + c.budgeted, 0);
      const generated = concepts.reduce((s, c) => s + c.generated, 0);
      groups.push({
        groupData: groupKey,
        budgeted,
        generated,
        balance: budgeted - generated,
        concepts
      });
    }

    return {
      id: budget?.id,
      condominiumId,
      year,
      status: budget?.status ?? BudgetStatus.OPEN,
      totalBudgeted: globalBudgeted,
      totalGenerated: globalGenerated,
      totalBalance: globalBudgeted - globalGenerated,
      summaryCards: [
        { title: "Saldo inicial", budgeted: 0, generated: 0 },
        { title: "Cuotas ordinarias", budgeted: globalBudgeted, generated: globalGenerated },
        { title: "Cuotas extraordinarias - Condóminos", budgeted: extraBudgeted, generated: extraGenerated },
        { title: "Cuotas STC", budgeted: 0, generated: 0 },
        { title: "Sanción", budgeted: 0, generated: 0 },
        { title: "Cuota extraordinaria - Comercios", budgeted: 0, generated: 0 },
        { title: "Comodato", budgeted: 0, generated: 0 }
      ],
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
          orderBy: { name: 'asc' }
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
      orderBy: { name: 'asc' }
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
      const newGroup = await prisma.budgetGroup.create({
        data: {
          ...rest,
          concepts: {
            create: concepts.map((c: any) => ({
              ...c,
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
