import type { UseCase } from "@/shared/application/use-case";
import type { DirectoryContactUpdatePayload } from "../domain/directory";
import type { DirectoryRepository } from "../domain/directory.repository";

export interface UpdateDirectoryContactInput {
  id: string;
  data: DirectoryContactUpdatePayload;
}

export class UpdateDirectoryContactUseCase implements UseCase<UpdateDirectoryContactInput, { idVq: string | null }> {
  constructor(private readonly repository: DirectoryRepository) {}

  async execute(input: UpdateDirectoryContactInput): Promise<{ idVq: string | null }> {
    return this.repository.updateContact(input.id, input.data);
  }
}
