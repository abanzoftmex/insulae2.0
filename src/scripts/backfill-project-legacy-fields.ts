import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyProjectPayload = {
  id_proyectos?: unknown;
  nombre?: unknown;
  iniciales?: unknown;
  sintesisAviso?: unknown;
  aviso_privacidad?: unknown;
  anioArranque?: unknown;
  id_cat_formas_proyectos?: unknown;
  totalM2?: unknown;
  totalApoles?: unknown;
  areasComunes?: unknown;
  logo?: unknown;
  imagen_sad?: unknown;
  imagen_pie?: unknown;
  pdfAviso?: unknown;
  pie_izquierda?: unknown;
  pie_derecha?: unknown;
  pie_desarrollado?: unknown;
  formulasUsodeSuelo?: unknown;
  manejovccc?: unknown;
  activo?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "0" && value.toLowerCase() !== "false";
  }

  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInt(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalize(text: string): string {
  return text.toLowerCase().replaceAll("'", "").replaceAll(" ", "");
}

async function readLegacyProjects(filePath: string): Promise<LegacyProjectPayload[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyProjectPayload);
}

async function main(): Promise<void> {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.split("=")[1];
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath = fileArg ?? path.resolve(scriptDir, "../../data/legacy-export/PROYECTOS.ndjson");

  const legacyProjects = await readLegacyProjects(filePath);
  if (legacyProjects.length === 0) {
    throw new Error(`No se encontraron registros en ${filePath}`);
  }

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode },
    select: { id: true, slug: true, name: true },
  });

  if (!condominium) {
    throw new Error(`No existe el condominio con slug ${PROJECT_SCOPE.condominiumCode}`);
  }

  const normalizedScopeName = normalize(PROJECT_SCOPE.condominiumName);
  const payload =
    legacyProjects.find((row) => {
      const name = asString(row.nombre);
      return name ? normalize(name).includes(normalizedScopeName) : false;
    }) ?? legacyProjects[0];

  const payloadLegacyId = asInt(payload.id_proyectos);
  let project =
    (payloadLegacyId !== null
      ? await prisma.project.findUnique({
          where: {
            condominiumId_legacyId: {
              condominiumId: condominium.id,
              legacyId: payloadLegacyId,
            },
          },
        })
      : null) ??
    (await prisma.project.findFirst({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { id: "desc" },
    }));

  if (!project) {
    project = await prisma.project.create({
      data: {
        condominiumId: condominium.id,
        legacyId: payloadLegacyId,
        name: asString(payload.nombre) ?? PROJECT_SCOPE.condominiumName,
        description: asString(payload.sintesisAviso),
        isActive: asBoolean(payload.activo, true),
      },
    });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      legacyId: payloadLegacyId ?? project.legacyId,
      name: asString(payload.nombre) ?? project.name,
      initials: asString(payload.iniciales),
      description: asString(payload.sintesisAviso),
      privacyNoticeText: asString(payload.aviso_privacidad),
      startYear: asInt(payload.anioArranque),
      condominiumFormatId: asInt(payload.id_cat_formas_proyectos),
      totalM2: asNumber(payload.totalM2),
      totalApoles: asInt(payload.totalApoles),
      commonAreasM2: asNumber(payload.areasComunes),
      condominiumLogoUrl: asString(payload.logo),
      condominiumImageUrl: asString(payload.imagen_sad),
      footerLogoUrl: asString(payload.imagen_pie),
      privacyNoticePdfUrl: asString(payload.pdfAviso),
      footerLeft: asString(payload.pie_izquierda),
      footerRight: asString(payload.pie_derecha),
      developedBy: asString(payload.pie_desarrollado),
      usesLandUseFormula: asBoolean(payload.formulasUsodeSuelo, false),
      hasVccc: asBoolean(payload.manejovccc, false),
      isActive: asBoolean(payload.activo, true),
    },
    select: {
      id: true,
      legacyId: true,
      name: true,
      initials: true,
      startYear: true,
      totalM2: true,
      totalApoles: true,
      commonAreasM2: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        projectId: updated.id,
        legacyId: updated.legacyId,
        name: updated.name,
        initials: updated.initials,
        startYear: updated.startYear,
        totalM2: updated.totalM2?.toString() ?? null,
        totalApoles: updated.totalApoles,
        commonAreasM2: updated.commonAreasM2?.toString() ?? null,
        sourceFile: filePath,
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
