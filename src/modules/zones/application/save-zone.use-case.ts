import type { UseCase } from "@/shared/application/use-case";

import type { SaveZoneInput, ZoneCommandResult } from "../domain/zone-form";
import type { ZoneFormRepository } from "../domain/zone-form.repository";

export class SaveZoneUseCase implements UseCase<SaveZoneInput, ZoneCommandResult> {
  constructor(private readonly repository: ZoneFormRepository) {}

  async execute(input: SaveZoneInput): Promise<ZoneCommandResult> {
    return this.repository.save(input);
  }
}
