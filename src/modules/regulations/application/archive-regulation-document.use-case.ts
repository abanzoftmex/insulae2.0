import type { UseCase } from "@/shared/application/use-case";

import type { RegulationCommandResult } from "../domain/regulation-directory";
import type { RegulationDirectoryRepository } from "../domain/regulation-directory.repository";

export class ArchiveRegulationDocumentUseCase
  implements UseCase<string, RegulationCommandResult>
{
  constructor(private readonly repository: RegulationDirectoryRepository) {}

  async execute(id: string): Promise<RegulationCommandResult> {
    return this.repository.archiveDocument(id);
  }
}
