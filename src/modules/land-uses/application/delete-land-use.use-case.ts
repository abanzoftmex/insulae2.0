import type { UseCase } from "@/shared/application/use-case";

import type { LandUseCommandResult } from "../domain/land-use-form";
import type { LandUseFormRepository } from "../domain/land-use-form.repository";

export class DeleteLandUseUseCase implements UseCase<string, LandUseCommandResult> {
  constructor(private readonly repository: LandUseFormRepository) {}

  async execute(id: string): Promise<LandUseCommandResult> {
    return this.repository.delete(id);
  }
}
