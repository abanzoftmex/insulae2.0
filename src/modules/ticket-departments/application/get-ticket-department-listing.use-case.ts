import type { UseCase } from "@/shared/application/use-case";

import type { TicketDepartmentListing } from "../domain/ticket-department";
import type { TicketDepartmentRepository } from "../domain/ticket-department.repository";

export class GetTicketDepartmentListingUseCase implements UseCase<void, TicketDepartmentListing | null> {
  constructor(private readonly repository: TicketDepartmentRepository) {}

  async execute(): Promise<TicketDepartmentListing | null> {
    return this.repository.getListing();
  }
}
