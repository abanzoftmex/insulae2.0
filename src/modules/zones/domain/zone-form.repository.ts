import type { SaveZoneInput, ZoneCommandResult, ZoneFormSnapshot } from "./zone-form";

export interface ZoneFormRepository {
  getById(id: string): Promise<ZoneFormSnapshot | null>;
  save(input: SaveZoneInput): Promise<ZoneCommandResult>;
}
