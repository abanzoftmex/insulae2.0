import { MiscIncomeCatalogRepository, SaveMiscIncomeConcept } from "../domain/misc-income-catalog.repository";

export class GetMiscIncomeCatalogUseCase {
  constructor(private readonly repository: MiscIncomeCatalogRepository) {}

  async execute(condominiumId: string) {
    return this.repository.findAll(condominiumId);
  }
}

export class SaveMiscIncomeCatalogUseCase {
  constructor(private readonly repository: MiscIncomeCatalogRepository) {}

  async execute(condominiumId: string, concepts: SaveMiscIncomeConcept[]) {
    return this.repository.save(condominiumId, concepts);
  }
}

export class DeleteMiscIncomeConceptUseCase {
  constructor(private readonly repository: MiscIncomeCatalogRepository) {}

  async execute(id: string) {
    return this.repository.delete(id);
  }
}
