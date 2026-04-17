import type { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  CondominiumReport,
  LandUseClassificationMode,
  LandUseZoneRow,
} from "../domain/condominium-report";
import type { CondominiumReportRepository } from "../domain/condominium-report.repository";

type PrivateAreaSnapshot = {
  isActive: boolean;
  zone: string | null;
  useType: string | null;
  m2Original: Prisma.Decimal | number | null;
  m2Apole: Prisma.Decimal | number | null;
  indiviso: Prisma.Decimal | number | null;
};

type LandUseCatalogSnapshot = {
  name: string;
  initials: string | null;
};

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeZone(value: string | null | undefined): string {
  const zone = value?.trim();
  return zone && zone.length > 0 ? zone : "Sin zona";
}

function normalizeUseType(value: string | null | undefined): string {
  const useType = value?.trim();
  return useType && useType.length > 0 ? useType : "Sin uso de suelo";
}

function canonicalZoneKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function hasUseType(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export class PrismaCondominiumReportRepository
  implements CondominiumReportRepository
{
  async getReport(): Promise<CondominiumReport | null> {
    const condominium =
      (await prisma.condominium.findFirst({
        where: {
          isActive: true,
          slug: PROJECT_SCOPE.condominiumCode,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          updatedAt: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: {
              id: true,
              name: true,
              totalApoles: true,
              totalM2: true,
              commonAreasM2: true,
            },
          },
        },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          updatedAt: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: {
              id: true,
              name: true,
              totalApoles: true,
              totalM2: true,
              commonAreasM2: true,
            },
          },
        },
      }));

    if (!condominium) {
      return null;
    }

    const [privateAreas, zoneCatalogs, landUseCatalogs, privateAreaLastUpdate] = await Promise.all([
      prisma.privateArea.findMany({
        where: { condominiumId: condominium.id },
        select: {
          isActive: true,
          zone: true,
          useType: true,
          m2Original: true,
          m2Apole: true,
          indiviso: true,
        },
      }),
      prisma.zoneCatalog.findMany({
        where: { condominiumId: condominium.id, isActive: true },
        orderBy: [{ legacyId: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      prisma.landUseCatalog.findMany({
        where: { condominiumId: condominium.id, isActive: true },
        orderBy: [{ order: "asc" }, { legacyId: "asc" }, { name: "asc" }],
        select: { name: true, initials: true },
      }),
      prisma.privateArea.aggregate({
        where: { condominiumId: condominium.id },
        _max: { updatedAt: true },
      }),
    ]);

    const project = condominium.projects[0] ?? null;
    const privateAreaSnapshots = privateAreas as PrivateAreaSnapshot[];

    const totalRegisteredPrivateAreas = privateAreaSnapshots.length;
    const activePrivateAreas = privateAreaSnapshots.filter((area) => area.isActive).length;
    const inactivePrivateAreas = totalRegisteredPrivateAreas - activePrivateAreas;
    const reportableAreas = privateAreaSnapshots.filter((area) => area.isActive);

    const areasWithUseType = reportableAreas.filter((area) => area.useType && area.useType.trim().length > 0).length;
    const areasWithoutUseType = reportableAreas.length - areasWithUseType;

    const totalPrivateAreaM2 = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Original),
      0,
    );
    const totalBuiltAreaM2 = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Apole),
      0,
    );
    const totalIndiviso = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.indiviso),
      0,
    );

    const zoneSet = new Set<string>();
    for (const zoneCatalog of zoneCatalogs) {
      if (zoneCatalog.name.trim().length > 0) {
        zoneSet.add(zoneCatalog.name.trim());
      }
    }
    for (const area of reportableAreas) {
      zoneSet.add(normalizeZone(area.zone));
    }
    if (zoneSet.size === 0) {
      zoneSet.add("Sin zona");
    }
    const preferredZoneOrder = [
      "Centro",
      "Bosques 1",
      "Bosques 2",
      "Fresnos",
      "Laurel",
      "Las Mercedes",
      "Centro-Carretero",
      "Bosque-Carretero",
      "Laurel-Carretero",
      "Fresno-Carretero",
    ];

    const preferredPriority = new Map(
      preferredZoneOrder.map((zone, index) => [canonicalZoneKey(zone), index]),
    );

    const zoneNames = Array.from(zoneSet.values()).sort((a, b) => {
      const aPriority = preferredPriority.get(canonicalZoneKey(a));
      const bPriority = preferredPriority.get(canonicalZoneKey(b));

      if (aPriority !== undefined && bPriority !== undefined) {
        return aPriority - bPriority;
      }

      if (aPriority !== undefined) {
        return -1;
      }

      if (bPriority !== undefined) {
        return 1;
      }

      return a.localeCompare(b, "es");
    });

    const catalogByName = new Map<string, LandUseCatalogSnapshot>();
    for (const catalog of landUseCatalogs as LandUseCatalogSnapshot[]) {
      catalogByName.set(normalizeKey(catalog.name), catalog);
    }

    const resolveUseTypeInitials = (useType: string | null | undefined): string | null => {
      if (!useType) {
        return null;
      }

      const normalized = normalizeKey(useType);
      const catalog = catalogByName.get(normalized);
      if (catalog?.initials && catalog.initials.trim().length > 0) {
        return catalog.initials.trim().toUpperCase();
      }

      const asInitials = useType.trim().toUpperCase();
      if (asInitials.length <= 5 && /^[A-Z0-9-]+$/.test(asInitials)) {
        return asInitials;
      }

      const trailingToken = asInitials.match(/([A-Z0-9-]{2,6})$/)?.[1] ?? null;
      if (trailingToken) {
        return trailingToken;
      }

      return null;
    };

    const lowerSlug = condominium.slug.toLowerCase();
    const lowerProjectName = project?.name?.toLowerCase() ?? "";
    const isSassiRule = lowerSlug.includes("sassi") || lowerProjectName.includes("sassi");
    const classificationMode: LandUseClassificationMode = isSassiRule ? "SASSI_LT" : "DEFAULT";

    const defaultSoles = new Set(["LB", "LB2", "LC", "LC2", "CC"]);
    const classificationBaseTotal = project?.totalApoles && project.totalApoles > 0
      ? project.totalApoles
      : reportableAreas.length;
    const classificationBaseLabel =
      project?.totalApoles && project.totalApoles > 0
        ? "APoLes del proyecto"
        : "areas operativas activas";

    let availableAreas = 0;
    let builtAreas = 0;
    let classifiedAreas = 0;

    for (const area of reportableAreas) {
      const initials = resolveUseTypeInitials(area.useType);
      if (classificationMode === "SASSI_LT") {
        if (initials === "LT") {
          availableAreas += 1;
          classifiedAreas += 1;
          continue;
        }

        if (initials === "LT-CR") {
          builtAreas += 1;
          classifiedAreas += 1;
        }
        continue;
      }

      if (initials && defaultSoles.has(initials)) {
        availableAreas += 1;
        classifiedAreas += 1;
        continue;
      }

      if (initials) {
        classifiedAreas += 1;
      }
    }

    const unclassifiedAreas = Math.max(reportableAreas.length - classifiedAreas, 0);

    if (classificationMode === "DEFAULT") {
      builtAreas = Math.max(classificationBaseTotal - availableAreas, 0);
    }

    const availableRatio = classificationBaseTotal > 0 ? (availableAreas / classificationBaseTotal) * 100 : 0;
    const builtRatio = classificationBaseTotal > 0 ? (builtAreas / classificationBaseTotal) * 100 : 0;

    const rowsByUseType = new Map<string, LandUseZoneRow>();
    const createRow = (landUseName: string, landUseInitials: string | null): LandUseZoneRow => {
      const byZone = Object.fromEntries(zoneNames.map((zone) => [zone, 0]));
      return {
        landUseName,
        landUseInitials,
        total: 0,
        byZone,
      };
    };

    for (const catalog of landUseCatalogs as LandUseCatalogSnapshot[]) {
      const key = normalizeKey(catalog.name);
      if (!rowsByUseType.has(key)) {
        rowsByUseType.set(
          key,
          createRow(catalog.name, catalog.initials?.trim() ? catalog.initials.trim() : null),
        );
      }
    }

    const totalsByZone = Object.fromEntries(zoneNames.map((zone) => [zone, 0])) as Record<string, number>;

    const matrixAreas = reportableAreas.filter((area) => hasUseType(area.useType));

    for (const area of matrixAreas) {
      const landUseName = normalizeUseType(area.useType);
      const rowKey = normalizeKey(landUseName);
      if (!rowsByUseType.has(rowKey)) {
        rowsByUseType.set(rowKey, createRow(landUseName, resolveUseTypeInitials(area.useType)));
      }

      const row = rowsByUseType.get(rowKey);
      if (!row) {
        continue;
      }

      const zoneName = normalizeZone(area.zone);
      if (!(zoneName in row.byZone)) {
        row.byZone[zoneName] = 0;
      }
      row.byZone[zoneName] += 1;
      row.total += 1;

      if (!(zoneName in totalsByZone)) {
        totalsByZone[zoneName] = 0;
      }
      totalsByZone[zoneName] += 1;
    }

    const landUseRows = Array.from(rowsByUseType.values());

    const grandTotal = Object.values(totalsByZone).reduce((acc, value) => acc + value, 0);

    const caveats: string[] = [
      "Este reporte usa isActive de PrivateArea como base operativa; no existe aun el status legacy (despierto/dormido/ocupado).",
      "No se consideran fusiones ni relaciones padre-hijo porque esos campos todavia no estan modelados en PrivateArea.",
    ];

    if (classificationMode === "SASSI_LT") {
      caveats.push("Clasificacion Soles/Sombras aplicada en modo SASSI: LT (soles) y LT-CR (sombras).");
    } else {
      caveats.push("Clasificacion Soles/Sombras aplicada en modo general: LB, LB2, LC, LC2, CC como soles.");
    }

    caveats.push(
      `Base de calculo para porcentajes y sombras: ${classificationBaseLabel} (${classificationBaseTotal}).`,
    );

    if (unclassifiedAreas > 0) {
      caveats.push(
        `Hay ${unclassifiedAreas} areas activas fuera de la clasificacion de soles/sombras por falta de uso de suelo o mapeo de iniciales.`,
      );
    }

    if (matrixAreas.length !== classificationBaseTotal) {
      caveats.push(
        `La matriz de uso de suelo usa ${matrixAreas.length} registros con uso asignado; puede diferir del total base (${classificationBaseTotal}).`,
      );
    }

    if (classificationMode === "SASSI_LT" && availableAreas + builtAreas < reportableAreas.length) {
      caveats.push("Hay areas activas fuera de LT y LT-CR; por eso Soles + Sombras puede ser menor al total operativo.");
    }

    const lastUpdatedAt =
      privateAreaLastUpdate._max.updatedAt && privateAreaLastUpdate._max.updatedAt > condominium.updatedAt
        ? privateAreaLastUpdate._max.updatedAt
        : condominium.updatedAt;

    return {
      condominiumId: condominium.id,
      condominiumName: condominium.name,
      condominiumSlug: condominium.slug,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectTotalApoles: project?.totalApoles ?? 0,
      projectTotalM2: decimalToNumber(project?.totalM2),
      projectCommonAreasM2: decimalToNumber(project?.commonAreasM2),
      totalRegisteredPrivateAreas,
      activePrivateAreas,
      inactivePrivateAreas,
      areasWithUseType,
      areasWithoutUseType,
      totalPrivateAreaM2,
      totalBuiltAreaM2,
      totalIndiviso,
      availableAreas,
      builtAreas,
      classificationBaseTotal,
      classificationBaseLabel,
      classifiedAreas,
      unclassifiedAreas,
      availableRatio,
      builtRatio,
      zoneNames,
      landUseRows,
      totalsByZone,
      grandTotal,
      classificationMode,
      caveats,
      lastUpdatedAt,
      generatedAt: new Date(),
    };
  }
}
