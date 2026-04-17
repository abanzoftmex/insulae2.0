import type { UseCase } from "@/shared/application/use-case";

import type {
  RegulationCommandResult,
  UpdateRegulationDocumentInput,
} from "../domain/regulation-directory";
import type { RegulationDirectoryRepository } from "../domain/regulation-directory.repository";

export class UpdateRegulationDocumentUseCase
  implements UseCase<UpdateRegulationDocumentInput, RegulationCommandResult>
{
  constructor(private readonly repository: RegulationDirectoryRepository) {}

  async execute(input: UpdateRegulationDocumentInput): Promise<RegulationCommandResult> {
    return this.repository.updateDocument(input);
  }
}
