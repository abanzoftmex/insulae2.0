import type { UseCase } from "@/shared/application/use-case";

import type { LandUseCommandResult, SaveLandUseInput } from "../domain/land-use-form";
import type { LandUseFormRepository } from "../domain/land-use-form.repository";

export class SaveLandUseUseCase implements UseCase<SaveLandUseInput, LandUseCommandResult> {
  constructor(private readonly repository: LandUseFormRepository) {}

  async execute(input: SaveLandUseInput): Promise<LandUseCommandResult> {
    return this.repository.save(input);
  }
}
