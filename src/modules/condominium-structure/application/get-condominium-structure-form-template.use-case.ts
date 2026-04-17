import type { CondominiumStructureFormTemplate } from "../domain/condominium-structure-form";
import type { CondominiumStructureFormRepository } from "../domain/condominium-structure-form.repository";

export class GetCondominiumStructureFormTemplateUseCase {
  constructor(private readonly repository: CondominiumStructureFormRepository) {}

  async execute(): Promise<CondominiumStructureFormTemplate | null> {
    return this.repository.getTemplate();
  }
}
