import type { UseCase } from "@/shared/application/use-case";

import type { ZoneFormSnapshot } from "../domain/zone-form";
import type { ZoneFormRepository } from "../domain/zone-form.repository";

export class GetZoneFormUseCase implements UseCase<string, ZoneFormSnapshot | null> {
  constructor(private readonly repository: ZoneFormRepository) {}

  async execute(id: string): Promise<ZoneFormSnapshot | null> {
    return this.repository.getById(id);
  }
}
