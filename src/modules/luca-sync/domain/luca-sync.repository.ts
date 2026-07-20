import type { IncomeSyncPayload, ExpenseSyncPayload } from "@abanzoftmex/luca-insulae-contract";

export type ReceiveIncomeResult =
  | { outcome: "created"; incomeId: string }
  | { outcome: "duplicate"; incomeId: string }
  | { outcome: "rejected"; reason: string };

export type ReceiveExpenseResult =
  | { outcome: "created"; expenseId: string }
  | { outcome: "duplicate"; expenseId: string }
  | { outcome: "rejected"; reason: string };

export type VoidResult =
  | { outcome: "voided" }
  | { outcome: "already_locked" }
  | { outcome: "not_found" };

export type ExecuteResult =
  | { outcome: "executed"; externalId: string; lucaApiBaseUrl: string | null; lucaWebhookSecret: string | null }
  | { outcome: "already_locked" }
  | { outcome: "not_found" }
  | { outcome: "not_synced" };

export interface ExecuteActor {
  userId: string;
}

export interface LucaSyncRepository {
  receiveIncome(payload: IncomeSyncPayload): Promise<ReceiveIncomeResult>;
  receiveExpense(payload: ExpenseSyncPayload): Promise<ReceiveExpenseResult>;
  voidIncome(tenantId: string, externalId: string): Promise<VoidResult>;
  voidExpense(tenantId: string, externalId: string): Promise<VoidResult>;
  executeIncome(
    id: string,
    actor: ExecuteActor,
    paymentMethod: string,
    reference: string | null,
    miscCatalogId?: string | null,
    chargeGroupId?: string | null,
  ): Promise<ExecuteResult>;
  executeExpense(
    id: string,
    actor: ExecuteActor,
    paymentMethod: string,
    reference: string | null,
  ): Promise<ExecuteResult>;
  recordCallbackFailure(entityType: "income" | "expense", id: string, error: string): Promise<void>;
}
