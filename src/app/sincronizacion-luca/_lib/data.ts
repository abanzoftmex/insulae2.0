import { prisma } from "@/shared/infrastructure/db/prisma";

export async function getActiveCondominium() {
  return prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
}

export async function getSyncCounts(condominiumId: string) {
  const [pendingIncomes, pendingExpenses, rejected] = await Promise.all([
    prisma.income.count({
      where: { condominiumId, externalSource: "LUCA", lockedAt: null },
    }),
    prisma.expense.count({
      where: { condominiumId, externalSource: "LUCA", lockedAt: null },
    }),
    prisma.lucaSyncEvent.count({
      where: { condominiumId, status: "REJECTED", archivedAt: null },
    }),
  ]);
  return { pendingIncomes, pendingExpenses, rejected };
}

type SyncSourceRow = {
  id: string;
  concept: string;
  notes: string | null;
  accountingNote: string | null;
  amount: unknown;
  date: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  paymentMethod: string | null;
  reference: string | null;
  externalId: string | null;
  miscCatalogId?: string | null;
  chargeGroupId?: string | null;
};

function toRow(r: SyncSourceRow, refLabel: string | null) {
  return {
    id: r.id,
    concept: r.concept,
    notes: r.notes,
    accountingNote: r.accountingNote,
    amount: Number(r.amount),
    date: r.date.toISOString().slice(0, 10),
    lockedAt: r.lockedAt ? r.lockedAt.toISOString() : null,
    lockedBy: r.lockedBy,
    paymentMethod: r.paymentMethod,
    reference: r.reference,
    externalId: r.externalId,
    miscCatalogId: r.miscCatalogId ?? null,
    chargeGroupId: r.chargeGroupId ?? null,
    refLabel,
  };
}

export async function getIncomeRows(condominiumId: string) {
  const incomes = await prisma.income.findMany({
    where: { condominiumId, externalSource: "LUCA" },
    orderBy: { date: "desc" },
    select: {
      id: true,
      concept: true,
      notes: true,
      accountingNote: true,
      amount: true,
      date: true,
      lockedAt: true,
      lockedBy: true,
      paymentMethod: true,
      reference: true,
      externalId: true,
      miscCatalogId: true,
      chargeGroupId: true,
      privateArea: { select: { name: true, code: true } },
    },
  });
  return incomes.map((i) => toRow(i, i.privateArea ? `${i.privateArea.code ?? ""} ${i.privateArea.name}`.trim() : "—"));
}

// Catálogo y grupo financiero disponibles para asignar a un cobro de Luca al
// ejecutarlo — igual que en el alta manual de un ingreso (listado-ingresos).
export async function getIncomeCatalogsAndGroups(condominiumId: string) {
  const [catalogs, chargeGroups] = await Promise.all([
    prisma.miscIncomeCatalog.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.chargeGroup.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { catalogs, chargeGroups };
}

export async function getExpenseRows(condominiumId: string) {
  const expenses = await prisma.expense.findMany({
    where: { condominiumId, externalSource: "LUCA" },
    orderBy: { date: "desc" },
    select: {
      id: true,
      concept: true,
      notes: true,
      accountingNote: true,
      amount: true,
      date: true,
      lockedAt: true,
      lockedBy: true,
      paymentMethod: true,
      reference: true,
      externalId: true,
      budgetConcept: { select: { name: true } },
    },
  });
  return expenses.map((e) => toRow(e, e.budgetConcept?.name ?? "—"));
}

function toRejectedRow(e: {
  id: string;
  entityType: string;
  externalId: string;
  errorMessage: string | null;
  receivedAt: Date;
  payload: unknown;
}) {
  const payload = e.payload as Record<string, unknown> | null;
  return {
    id: e.id,
    entityType: e.entityType,
    externalId: e.externalId,
    errorMessage: e.errorMessage,
    receivedAt: e.receivedAt.toISOString(),
    concept: typeof payload?.concept === "string" ? payload.concept : null,
    amount: typeof payload?.amount === "string" ? payload.amount : null,
  };
}

const rejectedSelect = {
  id: true,
  entityType: true,
  externalId: true,
  errorMessage: true,
  receivedAt: true,
  payload: true,
} as const;

export async function getRejectedRows(condominiumId: string) {
  const [active, archived] = await Promise.all([
    prisma.lucaSyncEvent.findMany({
      where: { condominiumId, status: "REJECTED", archivedAt: null },
      orderBy: { receivedAt: "desc" },
      select: rejectedSelect,
    }),
    prisma.lucaSyncEvent.findMany({
      where: { condominiumId, status: "REJECTED", archivedAt: { not: null } },
      orderBy: { receivedAt: "desc" },
      select: rejectedSelect,
    }),
  ]);
  return {
    active: active.map(toRejectedRow),
    archived: archived.map(toRejectedRow),
  };
}
