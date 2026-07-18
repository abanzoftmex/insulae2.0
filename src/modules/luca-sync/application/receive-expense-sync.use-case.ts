import type { ExpenseSyncPayload } from "@abanzoftmex/luca-insulae-contract";
import type { LucaSyncRepository } from "../domain/luca-sync.repository";

export class ReceiveExpenseSyncUseCase {
  constructor(private readonly repository: LucaSyncRepository) {}

  execute(payload: ExpenseSyncPayload) {
    return this.repository.receiveExpense(payload);
  }
}
