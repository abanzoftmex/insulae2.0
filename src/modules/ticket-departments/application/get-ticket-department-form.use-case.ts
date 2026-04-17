import type { UseCase } from "@/shared/application/use-case";

import type { TicketDepartmentFormSnapshot } from "../domain/ticket-department";
import type { TicketDepartmentRepository } from "../domain/ticket-department.repository";

export class GetTicketDepartmentFormUseCase implements UseCase<string, TicketDepartmentFormSnapshot | null> {
  constructor(private readonly repository: TicketDepartmentRepository) {}

  async execute(id: string): Promise<TicketDepartmentFormSnapshot | null> {
    return this.repository.getById(id);
  }
}
