import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  toPrivateAreaStatusFromLegacy,
  type PrivateAreaStatus,
} from "@/shared/domain/private-area-status";
import { readFile } from "node:fs/promises";
import path from "node:path";

type AreaRow = {
  id: string;
  condominiumId: string;
  legacyId: number | null;
  parentPrivateAreaId: string | null;
  sortOrder: number;
  status: PrivateAreaStatus;
  name: string;
};

type LegacyAreaRow = {
  legacyId: number;
  parentLegacyId: number | null;
  fusionGroupLegacyId: number | null;
  sortOrder: number | null;
  legacyStatusId: number | null;
};

const nameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function compareAreaNames(a: AreaRow, b: AreaRow): number {
  const byName = nameCollator.compare(normalizeName(a.name), normalizeName(b.name));
  if (byName !== 0) {
    return byName;
  }

  return a.id.localeCompare(b.id, "es");
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function readLegacyAreasMap(): Promise<Map<number, LegacyAreaRow>> {
  const filePath = path.resolve(process.cwd(), "data/legacy-export/AREAS_PRIVATIVAS.ndjson");
  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const map = new Map<number, LegacyAreaRow>();

  for (const line of lines) {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const legacyId = toInt(parsed.id_areas_privativas);
    if (legacyId === null) {
      continue;
    }

    const parentLegacyRaw = toInt(parsed.id_areas_privativas_padre);
    const parentLegacyId = parentLegacyRaw !== null && parentLegacyRaw > 0 ? parentLegacyRaw : null;
    const fusionGroupLegacyRaw = toInt(parsed.id_areas_privativas_hijo);
    const fusionGroupLegacyId =
      fusionGroupLegacyRaw !== null && fusionGroupLegacyRaw > 0 ? fusionGroupLegacyRaw : null;

    const sortOrder = toInt(parsed.ordenamiento) ?? toInt(parsed.orden);
    const legacyStatusId = toInt(parsed.id_cat_status);

    map.set(legacyId, {
      legacyId,
      parentLegacyId,
      fusionGroupLegacyId,
      sortOrder,
      legacyStatusId,
    });
  }

  return map;
}

async function main(): Promise<void> {
  const legacyAreasMap = await readLegacyAreasMap();

  const areas = await prisma.privateArea.findMany({
    select: {
      id: true,
      condominiumId: true,
      legacyId: true,
      parentPrivateAreaId: true,
      sortOrder: true,
      status: true,
      name: true,
    },
  });

  if (areas.length === 0) {
    console.info("No private areas found. Nothing to backfill.");
    return;
  }

  const siblingsByScope = new Map<string, AreaRow[]>();
  const areasByCondoAndLegacyId = new Map<string, AreaRow>();

  for (const area of areas as AreaRow[]) {
    if (area.legacyId !== null) {
      areasByCondoAndLegacyId.set(`${area.condominiumId}:${area.legacyId}`, area);
    }
  }

  const updatesByAreaId = new Map<
    string,
    {
      id: string;
      sortOrder?: number;
      parentPrivateAreaId?: string | null;
      status?: PrivateAreaStatus;
    }
  >();

  for (const area of areas as AreaRow[]) {
    if (area.legacyId === null) {
      continue;
    }

    const legacyRow = legacyAreasMap.get(area.legacyId);
    if (!legacyRow) {
      continue;
    }

    if (legacyRow.sortOrder !== null && area.sortOrder !== legacyRow.sortOrder) {
      const prev = updatesByAreaId.get(area.id) ?? { id: area.id };
      prev.sortOrder = legacyRow.sortOrder;
      updatesByAreaId.set(area.id, prev);
    }

    let mappedParentId: string | null = null;
    if (legacyRow.parentLegacyId !== null) {
      mappedParentId =
        areasByCondoAndLegacyId.get(`${area.condominiumId}:${legacyRow.parentLegacyId}`)?.id ?? null;
    } else if (legacyRow.fusionGroupLegacyId !== null) {
      mappedParentId =
        areasByCondoAndLegacyId.get(`${area.condominiumId}:${legacyRow.fusionGroupLegacyId}`)?.id ?? null;
    }

    if (area.parentPrivateAreaId !== mappedParentId) {
      const prev = updatesByAreaId.get(area.id) ?? { id: area.id };
      prev.parentPrivateAreaId = mappedParentId;
      updatesByAreaId.set(area.id, prev);
    }

    const nextStatus = toPrivateAreaStatusFromLegacy(legacyRow.legacyStatusId);

    if (area.status !== nextStatus) {
      const prev = updatesByAreaId.get(area.id) ?? { id: area.id };
      prev.status = nextStatus;
      updatesByAreaId.set(area.id, prev);
    }
  }

  for (const area of areas as AreaRow[]) {
    const pending = updatesByAreaId.get(area.id);
    const effectiveParentId = pending?.parentPrivateAreaId ?? area.parentPrivateAreaId;
    const effectiveSortOrder = pending?.sortOrder ?? area.sortOrder;

    const scopeKey = `${area.condominiumId}:${effectiveParentId ?? "ROOT"}`;
    const bucket = siblingsByScope.get(scopeKey) ?? [];
    bucket.push({
      ...area,
      parentPrivateAreaId: effectiveParentId,
      sortOrder: effectiveSortOrder,
    });
    siblingsByScope.set(scopeKey, bucket);
  }

  for (const siblings of siblingsByScope.values()) {
    const hasExplicitOrder = siblings.some((row) => row.sortOrder !== 0);
    if (hasExplicitOrder) {
      continue;
    }

    siblings.sort(compareAreaNames);

    for (let index = 0; index < siblings.length; index += 1) {
      const area = siblings[index];
      const inferredOrder = (index + 1) * 10;
      const prev = updatesByAreaId.get(area.id) ?? { id: area.id };

      if ((prev.sortOrder ?? area.sortOrder) === inferredOrder) {
        continue;
      }

      updatesByAreaId.set(area.id, {
        ...prev,
        // Leave gaps to make manual adjustments easier.
        sortOrder: inferredOrder,
      });
    }
  }

  const updates = Array.from(updatesByAreaId.values()).filter(
    (update) =>
      update.sortOrder !== undefined ||
      update.parentPrivateAreaId !== undefined ||
      update.status !== undefined,
  );

  if (updates.length === 0) {
    console.info("No private area ordering/hierarchy changes detected. Nothing to update.");
    return;
  }

  const batchSize = 100;
  for (let start = 0; start < updates.length; start += batchSize) {
    const batch = updates.slice(start, start + batchSize);

    for (const update of batch) {
      await prisma.privateArea.update({
        where: { id: update.id },
        data: {
          ...(update.sortOrder !== undefined ? { sortOrder: update.sortOrder } : {}),
          ...(update.parentPrivateAreaId !== undefined
            ? { parentPrivateAreaId: update.parentPrivateAreaId }
            : {}),
          ...(update.status !== undefined ? { status: update.status } : {}),
        },
      });
    }
  }

  const updatedSort = updates.filter((update) => update.sortOrder !== undefined).length;
  const updatedParents = updates.filter((update) => update.parentPrivateAreaId !== undefined).length;
  const updatedStatus = updates.filter((update) => update.status !== undefined).length;

  console.info(
    `Updated ${updates.length} private areas (sortOrder: ${updatedSort}, parentPrivateAreaId: ${updatedParents}, status: ${updatedStatus}).`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to backfill PrivateArea.sortOrder", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
