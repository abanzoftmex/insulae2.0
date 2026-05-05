import type { UseCase } from "@/shared/application/use-case";
import type { DirectoryRepository } from "../domain/directory.repository";

export class GetDirectoryRolesUseCase implements UseCase<void, Array<{ id: string; name: string }>> {
  constructor(private readonly repository: DirectoryRepository) {}

  async execute(): Promise<Array<{ id: string; name: string }>> {
    return this.repository.getRoles();
  }
}
