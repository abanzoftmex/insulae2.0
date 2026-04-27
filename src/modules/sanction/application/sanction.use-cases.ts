import { SanctionRepository, CreateSanctionRequest, UpdateSanctionRequest } from "../domain/sanction.types";

export class GetSanctionsUseCase {
  constructor(private readonly repository: SanctionRepository) {}

  async execute(condominiumId: string) {
    if (!condominiumId) throw new Error("Condominium ID is required");
    return this.repository.findAll(condominiumId);
  }
}

export class GetSanctionUseCase {
  constructor(private readonly repository: SanctionRepository) {}

  async execute(id: string, condominiumId: string) {
    if (!id || !condominiumId) throw new Error("ID and Condominium ID are required");
    return this.repository.findById(id, condominiumId);
  }
}

export class CreateSanctionUseCase {
  constructor(private readonly repository: SanctionRepository) {}

  async execute(req: CreateSanctionRequest) {
    if (!req.condominiumId) throw new Error("Condominium ID is required");
    if (!req.name || req.name.trim() === "") throw new Error("Name is required");

    return this.repository.create({
      ...req,
      name: req.name.trim(),
      article: req.article ? req.article.trim() : null,
    });
  }
}

export class UpdateSanctionUseCase {
  constructor(private readonly repository: SanctionRepository) {}

  async execute(req: UpdateSanctionRequest) {
    if (!req.id || !req.condominiumId) throw new Error("ID and Condominium ID are required");
    if (!req.name || req.name.trim() === "") throw new Error("Name is required");

    return this.repository.update({
      ...req,
      name: req.name.trim(),
      article: req.article ? req.article.trim() : null,
    });
  }
}

export class DeleteSanctionUseCase {
  constructor(private readonly repository: SanctionRepository) {}

  async execute(id: string, condominiumId: string) {
    if (!id || !condominiumId) throw new Error("ID and Condominium ID are required");
    return this.repository.delete(id, condominiumId);
  }
}
