import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/infrastructure/db/prisma";
import {
  ExpenseRepository,
  ExpenseListFilter,
  ExpenseRecord,
  SaveExpenseInput,
} from "../domain/expense.repository";

const expenseIncludes = {
  budgetConcept: {
    include: {
      group: true,
    },
  },
} satisfies Prisma.ExpenseInclude;

type PrismaExpenseWithIncludes = Prisma.ExpenseGetPayload<{
  include: typeof expenseIncludes;
}>;

function mapToRecord(row: PrismaExpenseWithIncludes): ExpenseRecord {
  return {
    id: row.id,
    date: row.date,
    concept: row.concept,
    amount: Number(row.amount),
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    receiptUrl: row.receiptUrl ?? row.legacyReceipt, // Fallback to legacy if no new receipt
    projectName: row.projectName ?? row.legacyProjectName, // Fallback to legacy project
    isActive: row.isActive,
    budgetConceptId: row.budgetConceptId,
    budgetConceptName: row.budgetConcept?.name ?? null,
    budgetGroupName: row.budgetConcept?.group?.name ?? null,
  };
}

export class PrismaExpenseRepository implements ExpenseRepository {
  async findAll(filter: ExpenseListFilter): Promise<ExpenseRecord[]> {
    const where: Prisma.ExpenseWhereInput = {
      condominiumId: filter.condominiumId,
      isActive: true, // Only show active expenses
    };

    if (filter.search) {
      where.OR = [
        { concept: { contains: filter.search, mode: "insensitive" } },
        { projectName: { contains: filter.search, mode: "insensitive" } },
        { legacyProjectName: { contains: filter.search, mode: "insensitive" } },
        { notes: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    if (filter.budgetConceptId) {
      where.budgetConceptId = filter.budgetConceptId;
    }

    if (filter.paymentMethod) {
      where.paymentMethod = filter.paymentMethod as any;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.date = {};
      if (filter.dateFrom) where.date.gte = filter.dateFrom;
      if (filter.dateTo) where.date.lte = filter.dateTo;
    }

    const rows = await prisma.expense.findMany({
      where,
      include: expenseIncludes,
    });

    const records = rows as any[];

    records.sort((a, b) => {
      const dayA = new Date(a.date).toISOString().slice(0, 10);
      const dayB = new Date(b.date).toISOString().slice(0, 10);
      if (dayA !== dayB) return dayB.localeCompare(dayA); // desc
      const idA = a.legacyId ?? Number.MAX_SAFE_INTEGER;
      const idB = b.legacyId ?? Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });

    return records.map(mapToRecord);
  }

  async findById(id: string): Promise<ExpenseRecord | null> {
    const row = await prisma.expense.findUnique({
      where: { id },
      include: expenseIncludes,
    });
    if (!row) return null;
    return mapToRecord(row);
  }

  async create(condominiumId: string, input: SaveExpenseInput): Promise<ExpenseRecord> {
    const row = await prisma.expense.create({
      data: {
        condominiumId,
        date: input.date,
        concept: input.concept,
        amount: input.amount,
        paymentMethod: input.paymentMethod as any,
        notes: input.notes ?? null,
        receiptUrl: input.receiptUrl ?? null,
        projectName: input.projectName ?? null,
        budgetConceptId: input.budgetConceptId ?? null,
      },
      include: expenseIncludes,
    });
    return mapToRecord(row);
  }

  async update(id: string, input: SaveExpenseInput): Promise<ExpenseRecord> {
    const row = await prisma.expense.update({
      where: { id },
      data: {
        date: input.date,
        concept: input.concept,
        amount: input.amount,
        paymentMethod: input.paymentMethod as any,
        notes: input.notes ?? null,
        receiptUrl: input.receiptUrl ?? null,
        projectName: input.projectName ?? null,
        budgetConceptId: input.budgetConceptId ?? null,
      },
      include: expenseIncludes,
    });
    return mapToRecord(row);
  }

  async hardDelete(id: string): Promise<void> {
    await prisma.expense.delete({
      where: { id },
    });
  }
}
