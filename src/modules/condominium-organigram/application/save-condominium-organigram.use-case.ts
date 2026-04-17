import type {
  CondominiumOrganigramCommandResult,
  SaveCondominiumOrganigramInput,
} from "../domain/condominium-organigram";
import type { CondominiumOrganigramRepository } from "../domain/condominium-organigram.repository";

export class SaveCondominiumOrganigramUseCase {
  constructor(private readonly repository: CondominiumOrganigramRepository) {}

  async execute(input: SaveCondominiumOrganigramInput): Promise<CondominiumOrganigramCommandResult> {
    return this.repository.save(input);
  }
}
