import type { UseCase } from "@/shared/application/use-case";

import type { DirectoryContactParticipation } from "../domain/directory";
import type { DirectoryRepository } from "../domain/directory.repository";

export class GetDirectoryContactParticipationUseCase
  implements UseCase<string, DirectoryContactParticipation | null>
{
  constructor(private readonly repository: DirectoryRepository) {}

  async execute(input: string): Promise<DirectoryContactParticipation | null> {
    return this.repository.getContactParticipation(input.trim());
  }
}
