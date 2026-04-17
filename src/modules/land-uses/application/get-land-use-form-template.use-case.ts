import type { UseCase } from "@/shared/application/use-case";

import type { LandUseFormTemplate } from "../domain/land-use-form";
import type { LandUseFormRepository } from "../domain/land-use-form.repository";

export class GetLandUseFormTemplateUseCase implements UseCase<void, LandUseFormTemplate | null> {
  constructor(private readonly repository: LandUseFormRepository) {}

  async execute(): Promise<LandUseFormTemplate | null> {
    return this.repository.getTemplate();
  }
}
