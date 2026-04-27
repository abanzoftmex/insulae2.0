import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/db/prisma";
import type {
  IncomeRecord,
  IncomeListFilter,
  IncomeRepository,
  SaveIncomeInput,
} from "../domain/income.repository";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

function mapToRecord(row: any): IncomeRecord {
  return {
    id: row.id,
    date: row.date,
    concept: row.concept,
    amount: decimalToNumber(row.amount),
    paymentMethod: row.paymentMethod ?? null,
    notes: row.notes ?? null,
    receiptUrl: row.receiptUrl ?? null,
    isActive: row.isActive,
    isConfirmed: row.isConfirmed ?? null,
    miscCatalogId: row.miscCatalogId ?? null,
    miscCatalogName: row.miscCatalog?.name ?? null,
    chargeGroupId: row.chargeGroupId ?? null,
    chargeGroupName: row.chargeGroup?.name ?? null,
    privateAreaId: row.privateAreaId ?? null,
    privateAreaName: row.privateArea?.name ?? null,
  };
}

const incomeIncludes = {
  miscCatalog: { select: { name: true } },
  chargeGroup: { select: { name: true } },
  privateArea: { select: { name: true } },
};

export class PrismaIncomeRepository implements IncomeRepository {
  async findAll(filter: IncomeListFilter): Promise<IncomeRecord[]> {
    const where: any = {
      condominiumId: filter.condominiumId,
      isActive: true,
    };

    if (filter.miscCatalogId) {
      where.miscCatalogId = filter.miscCatalogId;
    }

    if (filter.paymentMethod) {
      where.paymentMethod = filter.paymentMethod;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.date = {};
      if (filter.dateFrom) where.date.gte = filter.dateFrom;
      if (filter.dateTo) where.date.lte = filter.dateTo;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const term = filter.search.trim();
      where.OR = [
        { concept: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { miscCatalog: { name: { contains: term, mode: "insensitive" } } },
        { privateArea: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const rows = await prisma.income.findMany({
      where,
      include: incomeIncludes,
    });

    const records = rows as any[];

    // Sort: date DESC (day-level, ignoring time-of-day), then legacyId ASC within same date.
    // Legacy MySQL stores DATE (no time), but our ETL stored some as midnight UTC and others
    // at 06:00 UTC (timezone offset). Prisma's date DESC treats these as different, breaking
    // the expected order. We normalize to YYYY-MM-DD for comparison.
    records.sort((a, b) => {
      const dayA = new Date(a.date).toISOString().slice(0, 10);
      const dayB = new Date(b.date).toISOString().slice(0, 10);
      if (dayA !== dayB) return dayB.localeCompare(dayA); // desc
      // Within same date, sort by legacyId asc (legacy insertion order)
      const idA = a.legacyId ?? Number.MAX_SAFE_INTEGER;
      const idB = b.legacyId ?? Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });

    return records.map(mapToRecord);
  }

  async findById(id: string): Promise<IncomeRecord | null> {
    const row = await prisma.income.findUnique({
      where: { id },
      include: incomeIncludes,
    });

    if (!row) return null;
    return mapToRecord(row);
  }

  async create(condominiumId: string, input: SaveIncomeInput): Promise<IncomeRecord> {
    const row = await prisma.income.create({
      data: {
        condominiumId,
        date: input.date,
        concept: input.concept,
        amount: input.amount,
        paymentMethod: input.paymentMethod as any,
        notes: input.notes ?? null,
        receiptUrl: input.receiptUrl ?? null,
        miscCatalogId: input.miscCatalogId ?? null,
        chargeGroupId: input.chargeGroupId ?? null,
        privateAreaId: input.privateAreaId ?? null,
        isActive: true,
        isConfirmed: false,
      },
      include: incomeIncludes,
    });

    return mapToRecord(row);
  }

  async update(id: string, input: SaveIncomeInput): Promise<IncomeRecord> {
    const row = await prisma.income.update({
      where: { id },
      data: {
        date: input.date,
        concept: input.concept,
        amount: input.amount,
        paymentMethod: input.paymentMethod as any,
        notes: input.notes ?? null,
        receiptUrl: input.receiptUrl ?? null,
        miscCatalogId: input.miscCatalogId ?? null,
        chargeGroupId: input.chargeGroupId ?? null,
        privateAreaId: input.privateAreaId ?? null,
      },
      include: incomeIncludes,
    });

    return mapToRecord(row);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.income.delete({
      where: { id },
    });
  }
}
