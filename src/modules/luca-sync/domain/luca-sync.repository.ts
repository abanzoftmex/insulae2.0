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
  | { outcome: "not_synced" }
  // La categoría/grupo financiero (cobros) o la partida (gastos) elegidos no
  // pertenecen al condominio/grupo del registro que se está ejecutando, o ya
  // no están activos — se detecta en el servidor porque el filtro que ve el
  // usuario en el navegador (dropdown scoped al condominio/grupo) no es
  // suficiente por sí solo: un llamado directo a la API podría mandar
  // cualquier id existente.
  | { outcome: "invalid_assignment" };

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
    budgetConceptId?: string | null,
  ): Promise<ExecuteResult>;
  recordCallbackFailure(entityType: "income" | "expense", id: string, error: string): Promise<void>;
}
