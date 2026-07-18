import type { LucaSyncRepository, ExecuteResult } from "../domain/luca-sync.repository";
import { sendExecutionCallback } from "../infrastructure/luca-callback-client";

export interface ExecuteSyncRecordInput {
  entityType: "income" | "expense";
  id: string;
  actor: { userId: string; name: string };
  paymentMethod: string;
  reference?: string | null;
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
          )
        : await this.repository.executeExpense(
            input.id,
            { userId: input.actor.userId },
            input.paymentMethod,
            input.reference ?? null,
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
