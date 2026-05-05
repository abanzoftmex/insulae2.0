import type { UseCase } from "@/shared/application/use-case";
import type { DirectoryContactParticipation } from "../domain/directory";
import type { DirectoryRepository } from "../domain/directory.repository";

export interface UpdateDirectoryContactInput {
  id: string;
  data: Partial<DirectoryContactParticipation>;
}

export class UpdateDirectoryContactUseCase implements UseCase<UpdateDirectoryContactInput, void> {
  constructor(private readonly repository: DirectoryRepository) {}

  async execute(input: UpdateDirectoryContactInput): Promise<void> {
    return this.repository.updateContact(input.id, input.data);
  }
}
