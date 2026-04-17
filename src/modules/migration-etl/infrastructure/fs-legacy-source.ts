import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LegacyBatch, LegacyRow, LegacySource } from "../domain/legacy-source";

interface FsLegacySourceOptions {
  baseDir: string;
}

function toLegacyId(payload: Record<string, unknown>): number {
  const direct = payload.legacyId;
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return direct;
  }

  const idKey = Object.keys(payload).find((key) => key.startsWith("id_"));
  const idValue = idKey ? payload[idKey] : undefined;

  if (typeof idValue === "number" && Number.isFinite(idValue)) {
    return idValue;
  }

  if (typeof idValue === "string") {
    const parsed = Number.parseInt(idValue, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
  return Number.parseInt(hash, 16);
}

function toRows(legacyTable: string, lines: string[]): LegacyRow[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .map((payload) => ({
      legacyTable,
      legacyId: toLegacyId(payload),
      payload,
    }));
}

export class FsLegacySource implements LegacySource {
  constructor(private readonly options: FsLegacySourceOptions) {}

  private getTablePath(legacyTable: string): string {
    return join(this.options.baseDir, `${legacyTable}.ndjson`);
  }

  private getTableRows(legacyTable: string): LegacyRow[] {
    const filePath = this.getTablePath(legacyTable);
    if (!existsSync(filePath)) {
      return [];
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    return toRows(legacyTable, lines);
  }

  async countByTable(legacyTable: string): Promise<number> {
    return this.getTableRows(legacyTable).length;
  }

  async fetchBatch(legacyTable: string, offset: number, limit: number): Promise<LegacyBatch> {
    const rows = this.getTableRows(legacyTable);
    const slice = rows.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;

    return {
      rows: slice,
      hasMore: nextOffset < rows.length,
      nextOffset,
    };
  }
}
