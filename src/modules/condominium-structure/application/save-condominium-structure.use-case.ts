import type {
  CondominiumStructureCommandResult,
  SaveCondominiumStructureInput,
} from "../domain/condominium-structure-form";
import type { CondominiumStructureFormRepository } from "../domain/condominium-structure-form.repository";

export class SaveCondominiumStructureUseCase {
  constructor(private readonly repository: CondominiumStructureFormRepository) {}

  async execute(input: SaveCondominiumStructureInput): Promise<CondominiumStructureCommandResult> {
    return this.repository.save(input);
  }
}
