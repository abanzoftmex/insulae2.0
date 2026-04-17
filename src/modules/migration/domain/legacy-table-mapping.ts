export type LegacyAction = "migrar" | "no_migrar" | "reemplazar";

export interface LegacyTableMapping {
  legacyTable: string;
  action: LegacyAction;
  reason?: string;
}
