export interface LegacyRow {
  legacyTable: string;
  legacyId: number;
  payload: Record<string, unknown>;
}

export interface LegacyBatch {
  rows: LegacyRow[];
  hasMore: boolean;
  nextOffset: number;
}

export interface LegacySource {
  countByTable(legacyTable: string): Promise<number>;
  fetchBatch(legacyTable: string, offset: number, limit: number): Promise<LegacyBatch>;
}
