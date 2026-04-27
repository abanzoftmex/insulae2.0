import type { IncomeRepository, IncomeListFilter, SaveIncomeInput } from "../domain/income.repository";

export class ListIncomesUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  async execute(filter: IncomeListFilter) {
    return this.repo.findAll(filter);
  }
}

export class GetIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  async execute(id: string) {
    return this.repo.findById(id);
  }
}

export class CreateIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  async execute(condominiumId: string, input: SaveIncomeInput) {
    return this.repo.create(condominiumId, input);
  }
}

export class UpdateIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  async execute(id: string, input: SaveIncomeInput) {
    return this.repo.update(id, input);
  }
}

export class DeleteIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  async execute(id: string) {
    return this.repo.softDelete(id);
  }
}
