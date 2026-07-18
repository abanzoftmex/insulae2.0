import type { IncomeSyncPayload } from "@abanzoftmex/luca-insulae-contract";
import type { LucaSyncRepository } from "../domain/luca-sync.repository";

export class ReceiveIncomeSyncUseCase {
  constructor(private readonly repository: LucaSyncRepository) {}

  execute(payload: IncomeSyncPayload) {
    return this.repository.receiveIncome(payload);
  }
}
