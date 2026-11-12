import type { UseCase } from "@/shared/application/use-case";
import type { DirectoryRoleOption } from "../domain/directory";
import type { DirectoryRepository } from "../domain/directory.repository";

export class GetDirectoryRolesUseCase implements UseCase<void, DirectoryRoleOption[]> {
  constructor(private readonly repository: DirectoryRepository) {}

  async execute(): Promise<DirectoryRoleOption[]> {
    return this.repository.getRoles();
  }
}
