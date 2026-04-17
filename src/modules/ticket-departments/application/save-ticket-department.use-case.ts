import type { UseCase } from "@/shared/application/use-case";

import type { SaveTicketDepartmentInput, TicketDepartmentCommandResult } from "../domain/ticket-department";
import type { TicketDepartmentRepository } from "../domain/ticket-department.repository";

export class SaveTicketDepartmentUseCase
  implements UseCase<SaveTicketDepartmentInput, TicketDepartmentCommandResult>
{
  constructor(private readonly repository: TicketDepartmentRepository) {}

  async execute(input: SaveTicketDepartmentInput): Promise<TicketDepartmentCommandResult> {
    return this.repository.save(input);
  }
}
