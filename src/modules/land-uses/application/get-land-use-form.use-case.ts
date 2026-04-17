import type { UseCase } from "@/shared/application/use-case";

import type { LandUseFormSnapshot } from "../domain/land-use-form";
import type { LandUseFormRepository } from "../domain/land-use-form.repository";

export class GetLandUseFormUseCase implements UseCase<string, LandUseFormSnapshot | null> {
  constructor(private readonly repository: LandUseFormRepository) {}

  async execute(id: string): Promise<LandUseFormSnapshot | null> {
    return this.repository.getById(id);
  }
}
