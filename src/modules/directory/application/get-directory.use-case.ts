import type { UseCase } from "@/shared/application/use-case";

import type { DirectoryFilters, DirectoryOverview } from "../domain/directory";
import type { DirectoryRepository } from "../domain/directory.repository";

export class GetDirectoryUseCase
  implements UseCase<DirectoryFilters, DirectoryOverview | null>
{
  constructor(private readonly repository: DirectoryRepository) {}

  async execute(input: DirectoryFilters): Promise<DirectoryOverview | null> {
    return this.repository.getDirectory({
      query: input.query.trim(),
      page: Number.isFinite(input.page) && input.page > 0 ? input.page : 1,
      pageSize:
        Number.isFinite(input.pageSize) && input.pageSize > 0
          ? Math.min(input.pageSize, 200)
          : 100,
    });
  }
}
