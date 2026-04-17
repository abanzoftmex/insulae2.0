import type { UseCase } from "@/shared/application/use-case";

import type { SaveTicketResponseInput, TicketCommandResult } from "../domain/ticket";
import type { TicketRepository } from "../domain/ticket.repository";

export class SaveTicketResponseUseCase implements UseCase<SaveTicketResponseInput, TicketCommandResult> {
  constructor(private readonly repository: TicketRepository) {}

  async execute(input: SaveTicketResponseInput): Promise<TicketCommandResult> {
    return this.repository.saveResponse(input);
  }
}
