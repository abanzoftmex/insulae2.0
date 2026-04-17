export interface ZoneFormSnapshot {
  id: string;
  name: string;
  initials: string | null;
}

export interface SaveZoneInput {
  id?: string;
  name: string;
  initials?: string | null;
}

export interface ZoneCommandResult {
  ok: boolean;
  message: string;
  zoneId?: string;
}
