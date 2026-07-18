import type { LucaSyncRepository } from "../domain/luca-sync.repository";

export class VoidSyncRecordUseCase {
  constructor(private readonly repository: LucaSyncRepository) {}

  execute(entityType: "income" | "expense", tenantId: string, externalId: string) {
    return entityType === "income"
      ? this.repository.voidIncome(tenantId, externalId)
      : this.repository.voidExpense(tenantId, externalId);
  }
}
