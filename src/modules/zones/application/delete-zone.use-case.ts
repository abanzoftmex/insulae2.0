import type { UseCase } from "@/shared/application/use-case";

import type { ZoneCommandResult } from "../domain/zone-form";
import type { ZoneFormRepository } from "../domain/zone-form.repository";

export class DeleteZoneUseCase implements UseCase<string, ZoneCommandResult> {
  constructor(private readonly repository: ZoneFormRepository) {}

  async execute(id: string): Promise<ZoneCommandResult> {
    return this.repository.delete(id);
  }
}
