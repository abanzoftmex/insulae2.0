import type { CondominiumStructureFormSnapshot } from "../domain/condominium-structure-form";
import type { CondominiumStructureFormRepository } from "../domain/condominium-structure-form.repository";

export class GetCondominiumStructureFormUseCase {
  constructor(private readonly repository: CondominiumStructureFormRepository) {}

  async execute(id: string): Promise<CondominiumStructureFormSnapshot | null> {
    return this.repository.getById(id);
  }
}
