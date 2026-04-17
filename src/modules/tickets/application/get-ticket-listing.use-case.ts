import type { UseCase } from "@/shared/application/use-case";

import type { TicketListing } from "../domain/ticket";
import type { TicketRepository } from "../domain/ticket.repository";

export class GetTicketListingUseCase implements UseCase<void, TicketListing | null> {
  constructor(private readonly repository: TicketRepository) {}

  async execute(): Promise<TicketListing | null> {
    return this.repository.getListing();
  }
}
