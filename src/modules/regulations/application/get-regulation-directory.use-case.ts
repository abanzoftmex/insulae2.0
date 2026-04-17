import type { UseCase } from "@/shared/application/use-case";

import type { RegulationDirectory } from "../domain/regulation-directory";
import type { RegulationDirectoryRepository } from "../domain/regulation-directory.repository";

export class GetRegulationDirectoryUseCase
  implements UseCase<void, RegulationDirectory | null>
{
  constructor(private readonly repository: RegulationDirectoryRepository) {}

  async execute(): Promise<RegulationDirectory | null> {
    return this.repository.getDirectory();
  }
}
