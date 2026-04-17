import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { MigrationLayer } from "@/config/migration-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { LegacySource } from "../domain/legacy-source";

export interface LoadLayerToStagingInput {
  runId: string;
  layer: MigrationLayer;
  source: LegacySource;
  batchSize: number;
}

export class LoadLayerToStagingUseCase {
  async execute(input: LoadLayerToStagingInput): Promise<void> {
    for (const legacyTable of input.layer.tables) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await input.source.fetchBatch(legacyTable, offset, input.batchSize);

        if (batch.rows.length > 0) {
          await prisma.legacyStagingRow.createMany({
            data: batch.rows.map((row) => ({
              runId: input.runId,
              legacyTable: row.legacyTable,
              legacyId: row.legacyId,
              payload: row.payload as Prisma.InputJsonValue,
              payloadHash: createHash("sha256").update(JSON.stringify(row.payload)).digest("hex"),
              loadedAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }

        hasMore = batch.hasMore;
        offset = batch.nextOffset;
      }
    }
  }
}
