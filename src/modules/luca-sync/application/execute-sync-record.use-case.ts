import type { LucaSyncRepository, ExecuteResult } from "../domain/luca-sync.repository";
import { sendExecutionCallback } from "../infrastructure/luca-callback-client";

export interface ExecuteSyncRecordInput {
  entityType: "income" | "expense";
  id: string;
  actor: { userId: string; name: string };
  paymentMethod: string;
  reference?: string | null;
  // Solo aplica a income — categoría y grupo financiero de Insulae, elegidos
  // al ejecutar (un cobro de Luca no trae ninguno propio).
  miscCatalogId?: string | null;
  chargeGroupId?: string | null;
  // Solo aplica a expense — el gasto recibido de Luca ya está vinculado a un
  // BudgetGroup (por lucaAccountCode), pero la partida/concepto específica
  // dentro de ese grupo se elige al ejecutar.
  budgetConceptId?: string | null;
}

export class ExecuteSyncRecordUseCase {
  constructor(private readonly repository: LucaSyncRepository) {}

  async execute(input: ExecuteSyncRecordInput): Promise<ExecuteResult> {
    const result =
      input.entityType === "income"
        ? await this.repository.executeIncome(
            input.id,
            { userId: input.actor.userId },
            input.paymentMethod,
            input.reference ?? null,
            input.miscCatalogId,
            input.chargeGroupId,
          )
        : await this.repository.executeExpense(
            input.id,
            { userId: input.actor.userId },
            input.paymentMethod,
            input.reference ?? null,
            input.budgetConceptId,
          );

    if (result.outcome !== "executed") {
      return result;
    }

    if (!result.lucaApiBaseUrl || !result.lucaWebhookSecret) {
      await this.repository.recordCallbackFailure(
        input.entityType,
        input.id,
        "El condominio no tiene configurada la conexión con Luca (URL/secreto)",
      );
      return result;
    }

    const callback = await sendExecutionCallback(
      { baseUrl: result.lucaApiBaseUrl, secret: result.lucaWebhookSecret },
      {
        externalId: result.externalId,
        insulaeRecordId: input.id,
        type: input.entityType,
        status: "EXECUTED",
        paymentMethod: input.paymentMethod,
        reference: input.reference ?? null,
        executedBy: { insulaeUserId: input.actor.userId, name: input.actor.name },
        executedAt: new Date().toISOString(),
      },
    );

    if (!callback.ok) {
      // La ejecución local ya ocurrió y no se revierte por un callback fallido —
      // Luca no es alcanzable ahora mismo, pero el registro ya está bloqueado
      // y visible al condómino. Queda el rastro en LucaSyncEvent.errorMessage.
      await this.repository.recordCallbackFailure(input.entityType, input.id, callback.error);
    }

    return result;
  }
}
