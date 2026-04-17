import type { CondominiumStructureCommandResult } from "../domain/condominium-structure-form";
import type { CondominiumStructureFormRepository } from "../domain/condominium-structure-form.repository";

export class DeleteCondominiumStructureGroupUseCase {
  constructor(private readonly repository: CondominiumStructureFormRepository) {}

  async execute(groupId: string): Promise<CondominiumStructureCommandResult> {
    return this.repository.deleteGroup(groupId);
  }
}
