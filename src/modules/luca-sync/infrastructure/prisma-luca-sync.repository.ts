import { Prisma } from "@prisma/client";
import type { IncomeSyncPayload, ExpenseSyncPayload } from "@abanzoftmex/luca-insulae-contract";
import { prisma } from "@/shared/infrastructure/db/prisma";
import type {
  LucaSyncRepository,
  ReceiveIncomeResult,
  ReceiveExpenseResult,
  VoidResult,
  ExecuteResult,
  ExecuteActor,
} from "../domain/luca-sync.repository";

function isUniqueConstraintError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export class PrismaLucaSyncRepository implements LucaSyncRepository {
  private async resolveCondominium(tenantId: string) {
    return prisma.condominium.findUnique({
      where: { lucaTenantId: tenantId },
      select: { id: true },
    });
  }

  async receiveIncome(payload: IncomeSyncPayload): Promise<ReceiveIncomeResult> {
    const condominium = await this.resolveCondominium(payload.tenantId);
    if (!condominium) {
      return { outcome: "rejected", reason: "tenant_not_mapped" };
    }
    const condominiumId = condominium.id;

    try {
      return await prisma.$transaction(async (tx) => {
        await tx.lucaSyncEvent.create({
          data: {
            condominiumId,
            externalId: payload.externalId,
            entityType: "INCOME",
            payload: payload as unknown as Prisma.InputJsonValue,
            status: "RECEIVED",
          },
        });

        const privateArea = await tx.privateArea.findFirst({
          where: { condominiumId, lucaPropertyCode: payload.propertyExternalCode },
          select: { id: true },
        });

        if (!privateArea) {
          const reason = `Propiedad no mapeada: ${payload.propertyExternalCode}`;
          await tx.lucaSyncEvent.update({
            where: { condominiumId_externalId: { condominiumId, externalId: payload.externalId } },
            data: { status: "REJECTED", errorMessage: reason, processedAt: new Date() },
          });
          return { outcome: "rejected", reason: "property_not_mapped" };
        }

        const income = await tx.income.create({
          data: {
            condominiumId,
            date: new Date(payload.issuedAt),
            concept: payload.concept,
            amount: new Prisma.Decimal(payload.amount),
            notes: payload.internalNote ?? null,
            accountingNote: payload.accountingNote ?? null,
            privateAreaId: privateArea.id,
            externalSource: "LUCA",
            externalId: payload.externalId,
            isConfirmed: false,
            // isActive=false hasta que se ejecute: es el mismo filtro que usan
            // TODAS las pantallas existentes (listados, estado de cuenta del
            // condómino), así que mantenerlo en false es lo que evita que un
            // cobro sin validar aparezca antes de tiempo. Se pone en true al
            // ejecutar (ver executeIncome).
            isActive: false,
          },
        });

        await tx.lucaSyncEvent.update({
          where: { condominiumId_externalId: { condominiumId, externalId: payload.externalId } },
          data: { processedAt: new Date() },
        });

        return { outcome: "created", incomeId: income.id };
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return this.resolvePreviousIncomeOutcome(condominiumId, payload.externalId);
      }
      throw err;
    }
  }

  private async resolvePreviousIncomeOutcome(
    condominiumId: string,
    externalId: string,
  ): Promise<ReceiveIncomeResult> {
    const existing = await prisma.income.findFirst({
      where: { condominiumId, externalSource: "LUCA", externalId },
      select: { id: true },
    });
    if (existing) {
      return { outcome: "duplicate", incomeId: existing.id };
    }
    const event = await prisma.lucaSyncEvent.findUnique({
      where: { condominiumId_externalId: { condominiumId, externalId } },
    });
    return { outcome: "rejected", reason: event?.errorMessage ?? "previously_rejected" };
  }

  async receiveExpense(payload: ExpenseSyncPayload): Promise<ReceiveExpenseResult> {
    const condominium = await this.resolveCondominium(payload.tenantId);
    if (!condominium) {
      return { outcome: "rejected", reason: "tenant_not_mapped" };
    }
    const condominiumId = condominium.id;
    const year = new Date(payload.issuedAt).getFullYear();

    try {
      return await prisma.$transaction(async (tx) => {
        await tx.lucaSyncEvent.create({
          data: {
            condominiumId,
            externalId: payload.externalId,
            entityType: "EXPENSE",
            payload: payload as unknown as Prisma.InputJsonValue,
            status: "RECEIVED",
          },
        });

        const budgetConcept = await tx.budgetExpenseConcept.findFirst({
          where: { condominiumId, year, lucaAccountCode: payload.budgetAccountExternalCode },
          select: { id: true },
        });

        if (!budgetConcept) {
          const reason = `Partida presupuestal no mapeada: ${payload.budgetAccountExternalCode} (año ${year})`;
          await tx.lucaSyncEvent.update({
            where: { condominiumId_externalId: { condominiumId, externalId: payload.externalId } },
            data: { status: "REJECTED", errorMessage: reason, processedAt: new Date() },
          });
          return { outcome: "rejected", reason: "budget_account_not_mapped" };
        }

        const expense = await tx.expense.create({
          data: {
            condominiumId,
            date: new Date(payload.issuedAt),
            concept: payload.concept,
            amount: new Prisma.Decimal(payload.amount),
            notes: payload.internalNote ?? null,
            accountingNote: payload.accountingNote ?? null,
            budgetConceptId: budgetConcept.id,
            externalSource: "LUCA",
            externalId: payload.externalId,
            // Ver el comentario equivalente en receiveIncome: false hasta ejecutar.
            isActive: false,
          },
        });

        await tx.lucaSyncEvent.update({
          where: { condominiumId_externalId: { condominiumId, externalId: payload.externalId } },
          data: { processedAt: new Date() },
        });

        return { outcome: "created", expenseId: expense.id };
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return this.resolvePreviousExpenseOutcome(condominiumId, payload.externalId);
      }
      throw err;
    }
  }

  private async resolvePreviousExpenseOutcome(
    condominiumId: string,
    externalId: string,
  ): Promise<ReceiveExpenseResult> {
    const existing = await prisma.expense.findFirst({
      where: { condominiumId, externalSource: "LUCA", externalId },
      select: { id: true },
    });
    if (existing) {
      return { outcome: "duplicate", expenseId: existing.id };
    }
    const event = await prisma.lucaSyncEvent.findUnique({
      where: { condominiumId_externalId: { condominiumId, externalId } },
    });
    return { outcome: "rejected", reason: event?.errorMessage ?? "previously_rejected" };
  }

  async voidIncome(tenantId: string, externalId: string): Promise<VoidResult> {
    const condominium = await this.resolveCondominium(tenantId);
    if (!condominium) return { outcome: "not_found" };

    const income = await prisma.income.findFirst({
      where: { condominiumId: condominium.id, externalSource: "LUCA", externalId },
      select: { id: true, lockedAt: true },
    });
    if (!income) return { outcome: "not_found" };
    if (income.lockedAt) return { outcome: "already_locked" };

    await prisma.$transaction([
      prisma.income.update({ where: { id: income.id }, data: { isActive: false } }),
      prisma.lucaSyncEvent.update({
        where: { condominiumId_externalId: { condominiumId: condominium.id, externalId } },
        data: { status: "REJECTED", errorMessage: "Anulado por Luca antes de ejecución", processedAt: new Date() },
      }),
    ]);

    return { outcome: "voided" };
  }

  async voidExpense(tenantId: string, externalId: string): Promise<VoidResult> {
    const condominium = await this.resolveCondominium(tenantId);
    if (!condominium) return { outcome: "not_found" };

    const expense = await prisma.expense.findFirst({
      where: { condominiumId: condominium.id, externalSource: "LUCA", externalId },
      select: { id: true, lockedAt: true },
    });
    if (!expense) return { outcome: "not_found" };
    if (expense.lockedAt) return { outcome: "already_locked" };

    await prisma.$transaction([
      prisma.expense.update({ where: { id: expense.id }, data: { isActive: false } }),
      prisma.lucaSyncEvent.update({
        where: { condominiumId_externalId: { condominiumId: condominium.id, externalId } },
        data: { status: "REJECTED", errorMessage: "Anulado por Luca antes de ejecución", processedAt: new Date() },
      }),
    ]);

    return { outcome: "voided" };
  }

  async executeIncome(
    id: string,
    actor: ExecuteActor,
    paymentMethod: string,
    reference: string | null,
    miscCatalogId?: string | null,
    chargeGroupId?: string | null,
  ): Promise<ExecuteResult> {
    const income = await prisma.income.findUnique({
      where: { id },
      select: { id: true, condominiumId: true, externalSource: true, externalId: true, lockedAt: true },
    });
    if (!income) return { outcome: "not_found" };
    if (!income.externalId || income.externalSource !== "LUCA") return { outcome: "not_synced" };
    if (income.lockedAt) return { outcome: "already_locked" };

    await prisma.$transaction([
      prisma.income.update({
        where: { id },
        data: {
          lockedAt: new Date(),
          lockedBy: actor.userId,
          paymentMethod: paymentMethod as Prisma.IncomeUpdateInput["paymentMethod"],
          reference,
          // Asignados al ejecutar, igual que forma de pago/referencia — un
          // cobro de Luca llega sin categoría ni grupo financiero propios de
          // Insulae, así que se eligen aquí antes de confirmarlo.
          ...(miscCatalogId !== undefined ? { miscCatalogId: miscCatalogId || null } : {}),
          ...(chargeGroupId !== undefined ? { chargeGroupId: chargeGroupId || null } : {}),
          isConfirmed: true,
          // Ahora sí es visible en listados y estado de cuenta del condómino.
          isActive: true,
        },
      }),
      prisma.lucaSyncEvent.update({
        where: { condominiumId_externalId: { condominiumId: income.condominiumId, externalId: income.externalId } },
        data: { status: "EXECUTED", processedAt: new Date() },
      }),
    ]);

    const condo = await prisma.condominium.findUnique({
      where: { id: income.condominiumId },
      select: { lucaApiBaseUrl: true, lucaWebhookSecret: true },
    });

    return {
      outcome: "executed",
      externalId: income.externalId,
      lucaApiBaseUrl: condo?.lucaApiBaseUrl ?? null,
      lucaWebhookSecret: condo?.lucaWebhookSecret ?? null,
    };
  }

  async executeExpense(
    id: string,
    actor: ExecuteActor,
    paymentMethod: string,
    reference: string | null,
  ): Promise<ExecuteResult> {
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, condominiumId: true, externalSource: true, externalId: true, lockedAt: true },
    });
    if (!expense) return { outcome: "not_found" };
    if (!expense.externalId || expense.externalSource !== "LUCA") return { outcome: "not_synced" };
    if (expense.lockedAt) return { outcome: "already_locked" };

    await prisma.$transaction([
      prisma.expense.update({
        where: { id },
        data: {
          lockedAt: new Date(),
          lockedBy: actor.userId,
          paymentMethod: paymentMethod as Prisma.ExpenseUpdateInput["paymentMethod"],
          reference,
          // Ahora sí es visible en listados y estado de cuenta del condómino.
          isActive: true,
        },
      }),
      prisma.lucaSyncEvent.update({
        where: { condominiumId_externalId: { condominiumId: expense.condominiumId, externalId: expense.externalId } },
        data: { status: "EXECUTED", processedAt: new Date() },
      }),
    ]);

    const condo = await prisma.condominium.findUnique({
      where: { id: expense.condominiumId },
      select: { lucaApiBaseUrl: true, lucaWebhookSecret: true },
    });

    return {
      outcome: "executed",
      externalId: expense.externalId,
      lucaApiBaseUrl: condo?.lucaApiBaseUrl ?? null,
      lucaWebhookSecret: condo?.lucaWebhookSecret ?? null,
    };
  }

  async recordCallbackFailure(entityType: "income" | "expense", id: string, error: string): Promise<void> {
    const record =
      entityType === "income"
        ? await prisma.income.findUnique({ where: { id }, select: { condominiumId: true, externalId: true } })
        : await prisma.expense.findUnique({ where: { id }, select: { condominiumId: true, externalId: true } });

    if (!record?.externalId) return;

    await prisma.lucaSyncEvent.update({
      where: { condominiumId_externalId: { condominiumId: record.condominiumId, externalId: record.externalId } },
      data: { errorMessage: `Callback a Luca falló: ${error}` },
    });
  }
}
