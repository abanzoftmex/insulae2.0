import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyDirectoryAssignmentPayload = {
  id_directorio_has_asignaciones?: unknown;
  id_directorio?: unknown;
  id_roles_condominal?: unknown;
  id?: unknown;
  activo?: unknown;
  created_at?: unknown;
  deleted_at?: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInt(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true") {
      return true;
    }
    if (normalized === "0" || normalized === "false") {
      return false;
    }
  }

  return fallback;
}

function asDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function readLegacyAssignments(filePath: string): Promise<LegacyDirectoryAssignmentPayload[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyDirectoryAssignmentPayload);
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.split("=")[1];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath =
    fileArg ?? path.resolve(scriptDir, "../../data/legacy-export/DIRECTORIO_HAS_ASIGNACIONES.ndjson");

  const rawAssignments = await readLegacyAssignments(filePath);

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode },
    select: { id: true, slug: true, name: true },
  });

  if (!condominium) {
    throw new Error(`No existe el condominio con slug ${PROJECT_SCOPE.condominiumCode}`);
  }

  const latestByKey = new Map<string, LegacyDirectoryAssignmentPayload>();

  for (const payload of rawAssignments) {
    const userLegacyId = asInt(payload.id_directorio);
    const roleLegacyId = asInt(payload.id_roles_condominal);
    const privateAreaLegacyId = asInt(payload.id);

    if (userLegacyId === null || roleLegacyId === null || privateAreaLegacyId === null) {
      continue;
    }

    const key = `${privateAreaLegacyId}:${userLegacyId}:${roleLegacyId}`;
    const candidateSeq = asInt(payload.id_directorio_has_asignaciones) ?? 0;

    const current = latestByKey.get(key);
    const currentSeq = current ? asInt(current.id_directorio_has_asignaciones) ?? 0 : -1;

    if (!current || candidateSeq >= currentSeq) {
      latestByKey.set(key, payload);
    }
  }

  const dedupedAssignments = [...latestByKey.values()];

  const userLegacyIds = [...new Set(dedupedAssignments.map((row) => asInt(row.id_directorio)).filter((id): id is number => id !== null))];
  const roleLegacyIds = [...new Set(dedupedAssignments.map((row) => asInt(row.id_roles_condominal)).filter((id): id is number => id !== null))];
  const privateAreaLegacyIds = [...new Set(dedupedAssignments.map((row) => asInt(row.id)).filter((id): id is number => id !== null))];

  const [users, roles, privateAreas] = await Promise.all([
    prisma.user.findMany({
      where: {
        condominiumId: condominium.id,
        legacyId: { in: userLegacyIds },
        isActive: true,
      },
      select: { id: true, legacyId: true },
    }),
    prisma.role.findMany({
      where: { legacyId: { in: roleLegacyIds } },
      select: { id: true, legacyId: true, name: true },
    }),
    prisma.privateArea.findMany({
      where: {
        condominiumId: condominium.id,
        legacyId: { in: privateAreaLegacyIds },
      },
      select: { id: true, legacyId: true },
    }),
  ]);

  const userByLegacyId = new Map(users.map((user) => [user.legacyId as number, user.id]));
  const roleByLegacyId = new Map(roles.map((role) => [role.legacyId as number, role]));
  const privateAreaByLegacyId = new Map(
    privateAreas.map((privateArea) => [privateArea.legacyId as number, privateArea.id]),
  );

  const toInsert: Array<{
    condominiumId: string;
    userId: string;
    privateAreaId: string;
    roleName: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
  }> = [];

  let skippedMissingUser = 0;
  let skippedMissingRole = 0;
  let skippedMissingPrivateArea = 0;

  for (const payload of dedupedAssignments) {
    const userLegacyId = asInt(payload.id_directorio);
    const roleLegacyId = asInt(payload.id_roles_condominal);
    const privateAreaLegacyId = asInt(payload.id);

    if (userLegacyId === null || roleLegacyId === null || privateAreaLegacyId === null) {
      continue;
    }

    const userId = userByLegacyId.get(userLegacyId) ?? null;
    const role = roleByLegacyId.get(roleLegacyId) ?? null;
    const privateAreaId = privateAreaByLegacyId.get(privateAreaLegacyId) ?? null;

    if (!userId) {
      skippedMissingUser += 1;
      continue;
    }

    if (!role) {
      skippedMissingRole += 1;
      continue;
    }

    if (!privateAreaId) {
      skippedMissingPrivateArea += 1;
      continue;
    }

    toInsert.push({
      condominiumId: condominium.id,
      userId,
      privateAreaId,
      roleName: role.name,
      startsAt: asDate(payload.created_at),
      endsAt: asDate(payload.deleted_at),
      isActive: asBoolean(payload.activo, true),
    });
  }

  const summary = {
    condominium: condominium.slug,
    sourceFile: filePath,
    rawRows: rawAssignments.length,
    dedupedRows: dedupedAssignments.length,
    readyToInsert: toInsert.length,
    activeReadyToInsert: toInsert.filter((row) => row.isActive).length,
    skippedMissingUser,
    skippedMissingRole,
    skippedMissingPrivateArea,
    apply,
  };

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    console.log("Dry-run completado. Ejecuta con --apply para persistir cambios.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.residentAssignment.deleteMany({
      where: { condominiumId: condominium.id },
    });

    if (toInsert.length > 0) {
      await tx.residentAssignment.createMany({ data: toInsert });
    }
  });

  const finalCount = await prisma.residentAssignment.count({
    where: { condominiumId: condominium.id },
  });

  console.log(
    JSON.stringify(
      {
        ...summary,
        insertedCount: toInsert.length,
        residentAssignmentsAfterBackfill: finalCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
