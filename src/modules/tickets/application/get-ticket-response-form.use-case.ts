import type { UseCase } from "@/shared/application/use-case";

import type { TicketResponseFormData } from "../domain/ticket";
import type { TicketRepository } from "../domain/ticket.repository";

export class GetTicketResponseFormUseCase implements UseCase<string, TicketResponseFormData | null> {
  constructor(private readonly repository: TicketRepository) {}

  async execute(ticketId: string): Promise<TicketResponseFormData | null> {
    return this.repository.getResponseFormData(ticketId);
  }
}
