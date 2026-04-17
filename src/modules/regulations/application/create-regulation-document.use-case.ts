import type { UseCase } from "@/shared/application/use-case";

import type {
  CreateRegulationDocumentInput,
  RegulationCommandResult,
} from "../domain/regulation-directory";
import type { RegulationDirectoryRepository } from "../domain/regulation-directory.repository";

export class CreateRegulationDocumentUseCase
  implements UseCase<CreateRegulationDocumentInput, RegulationCommandResult>
{
  constructor(private readonly repository: RegulationDirectoryRepository) {}

  async execute(input: CreateRegulationDocumentInput): Promise<RegulationCommandResult> {
    return this.repository.createDocument(input);
  }
}
