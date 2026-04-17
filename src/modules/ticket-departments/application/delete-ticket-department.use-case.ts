import type { UseCase } from "@/shared/application/use-case";

import type { TicketDepartmentCommandResult } from "../domain/ticket-department";
import type { TicketDepartmentRepository } from "../domain/ticket-department.repository";

export class DeleteTicketDepartmentUseCase implements UseCase<string, TicketDepartmentCommandResult> {
  constructor(private readonly repository: TicketDepartmentRepository) {}

  async execute(id: string): Promise<TicketDepartmentCommandResult> {
    return this.repository.delete(id);
  }
}
