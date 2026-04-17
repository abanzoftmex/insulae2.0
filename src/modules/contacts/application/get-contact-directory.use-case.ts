import type { UseCase } from "@/shared/application/use-case";

import type { ContactDirectory } from "../domain/contact-directory";
import type { ContactDirectoryRepository } from "../domain/contact-directory.repository";

export class GetContactDirectoryUseCase
  implements UseCase<void, ContactDirectory | null>
{
  constructor(private readonly repository: ContactDirectoryRepository) {}

  async execute(): Promise<ContactDirectory | null> {
    return this.repository.getDirectory();
  }
}
