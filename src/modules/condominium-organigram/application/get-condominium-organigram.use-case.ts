import type { CondominiumOrganigramSnapshot } from "../domain/condominium-organigram";
import type { CondominiumOrganigramRepository } from "../domain/condominium-organigram.repository";

export class GetCondominiumOrganigramUseCase {
  constructor(private readonly repository: CondominiumOrganigramRepository) {}

  async execute(): Promise<CondominiumOrganigramSnapshot | null> {
    return this.repository.getSnapshot();
  }
}
