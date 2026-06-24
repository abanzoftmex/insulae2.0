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
  id: string;
  name: string;
  isActive: boolean;
  zone: string | null;
  useType: string | null;
  status: string;
  isFusion: boolean;
  m2Original: Prisma.Decimal | number | null;
  m2Apole: Prisma.Decimal | number | null;
  m2Construction: Prisma.Decimal | number | null;
  m2CommonArea: Prisma.Decimal | number | null;
  m2CommonAreaChildren: Prisma.Decimal | number | null;
  m2ConstructionCommonArea: Prisma.Decimal | number | null;
  indiviso: Prisma.Decimal | number | null;
  parentPrivateAreaId: string | null;
  parentPrivateArea: {
    isFusion: boolean;
  } | null;
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
          updatedBy: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: {
              id: true,
              name: true,
              totalApoles: true,
              totalM2: true,
              commonAreasM2: true,
              privateAreasM2: true,
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
          updatedBy: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: {
              id: true,
              name: true,
              totalApoles: true,
              totalM2: true,
              commonAreasM2: true,
              privateAreasM2: true,
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
          id: true,
          name: true,
          isActive: true,
          zone: true,
          useType: true,
          status: true,
          isFusion: true,
          m2Original: true,
          m2Apole: true,
          m2Construction: true,
          m2CommonArea: true,
          m2CommonAreaChildren: true,
          m2ConstructionCommonArea: true,
          indiviso: true,
          parentPrivateAreaId: true,
          parentPrivateArea: {
            select: {
              isFusion: true,
            },
          },
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
      prisma.privateArea.findFirst({
        where: { condominiumId: condominium.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true, updatedBy: true },
      }),
    ]);

    const project = condominium.projects[0] ?? null;
    const privateAreaSnapshots = privateAreas as PrivateAreaSnapshot[];

    const totalRegisteredPrivateAreas = privateAreaSnapshots.length;
    const activePrivateAreas = privateAreaSnapshots.filter((area) => area.isActive).length;
    const inactivePrivateAreas = totalRegisteredPrivateAreas - activePrivateAreas;
    
    // Todas las áreas activas son reportables, independientemente del status
    // comercial (AVAILABLE, SOLD, RENTED, UNASSIGNED). El campo `status` nunca
    // se puebla desde la app (siempre queda en UNASSIGNED), por lo que usar ese
    // filtro dejaba fuera TODAS las áreas nuevas → soles=0, sombras=0.
    // Usamos el mismo criterio que prisma-condominium-overview.repository.ts.
    const reportableAreas = privateAreaSnapshots.filter((area) => area.isActive);

    // Parent areas (where legacy id_areas_privativas_padre = 0 or null)
    // and es_fusion = 0
    const parentAreas = reportableAreas.filter(
      (area) =>
        !area.isFusion &&
        (area.parentPrivateAreaId === null ||
          (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
    );

    const activeParents = parentAreas.length;
    const activeChildren = reportableAreas.filter(
      (area) =>
        !area.isFusion &&
        area.parentPrivateAreaId !== null &&
        (area.parentPrivateArea?.isFusion === false || area.name.includes("-"))
    ).length;

    // legacy variables mapping:
    // 1. parentAreasCount
    const parentAreasCount = parentAreas.length;
    // 2. parentAreasM2
    const parentAreasM2 = parentAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Original),
      0
    );
    // Group active children by parentPrivateAreaId to sum up common area in-memory
    const childAreasByParentId = new Map<string, PrivateAreaSnapshot[]>();
    for (const area of reportableAreas) {
      if (area.parentPrivateAreaId) {
        const list = childAreasByParentId.get(area.parentPrivateAreaId) ?? [];
        list.push(area);
        childAreasByParentId.set(area.parentPrivateAreaId, list);
      }
    }

    // 3. parentAreasCommonM2
    let parentAreasCommonM2 = parentAreas.reduce((acc, parentArea) => {
      const children = childAreasByParentId.get(parentArea.id) ?? [];
      const childrenCommonAreaChildrenM2 = children.reduce(
        (sum, child) => sum + decimalToNumber(child.m2ConstructionCommonArea),
        0
      );
      return acc + childrenCommonAreaChildrenM2;
    }, 0);

    if (parentAreasCommonM2 === 0) {
      parentAreasCommonM2 = parentAreas.reduce(
        (acc, area) => acc + decimalToNumber(area.m2CommonArea),
        0
      );
    }
    // 4. activeFusionsCount
    const activeFusionsCount = reportableAreas.filter((area) => area.isFusion).length;

    // Fracciones: count of areas with active use type
    const areasWithUseType = reportableAreas.filter(
      (area) => area.useType && area.useType.trim().length > 0
    ).length;
    const areasWithoutUseType = reportableAreas.length - areasWithUseType;

    const inactiveParents = privateAreaSnapshots.filter(
      (area) =>
        !area.isActive &&
        !area.isFusion &&
        (area.parentPrivateAreaId === null ||
          (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
    ).length;
    const inactiveChildren = privateAreaSnapshots.filter(
      (area) =>
        !area.isActive &&
        !area.isFusion &&
        area.parentPrivateAreaId !== null &&
        (area.parentPrivateArea?.isFusion === false || area.name.includes("-"))
    ).length;

    const totalPrivateAreaM2 = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Original),
      0,
    );
    const totalApoleAreaM2 = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Apole),
      0,
    );
    const totalBuiltAreaM2 = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Construction),
      0,
    );
    const totalIndiviso = reportableAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.indiviso),
      0,
    );

    const catalogZoneByLower = new Map<string, string>();
    for (const zoneCatalog of zoneCatalogs) {
      const trimmed = zoneCatalog.name.trim();
      if (trimmed.length > 0) {
        catalogZoneByLower.set(trimmed.toLowerCase(), trimmed);
      }
    }

    const resolveZoneName = (zoneVal: string | null | undefined): string => {
      const norm = normalizeZone(zoneVal);
      return catalogZoneByLower.get(norm.toLowerCase()) ?? norm;
    };

    const zoneSet = new Set<string>();
    for (const exactCatalogName of catalogZoneByLower.values()) {
      zoneSet.add(exactCatalogName);
    }
    for (const area of reportableAreas) {
      zoneSet.add(resolveZoneName(area.zone));
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
    const classificationBaseTotal = parentAreas.length;
    const classificationBaseLabel = "lotes padre activos";

    const useTypeLookup = new Map<string, { label: string; initials: string }>();
    for (const catalog of landUseCatalogs as LandUseCatalogSnapshot[]) {
      const label = catalog.name.trim();
      const initials = catalog.initials?.trim() ? catalog.initials.trim() : label;
      const entry = { label, initials };
      useTypeLookup.set(normalizeKey(label), entry);
      useTypeLookup.set(normalizeKey(initials), entry);
    }

    const resolveUseType = (rawUseType: string | null | undefined): { label: string; initials: string } => {
      const useType = rawUseType?.trim();
      if (!useType) {
        return { label: "Sin uso de suelo", initials: "N/A" };
      }

      const match = useTypeLookup.get(normalizeKey(useType));
      if (match) {
        return match;
      }

      const initials = resolveUseTypeInitials(useType) ?? "N/A";
      return { label: useType, initials };
    };

    let availableAreas = 0;
    let classifiedAreas = 0;

    for (const area of reportableAreas) {
      if (area.isFusion) continue;
      const { initials } = resolveUseType(area.useType);
      
      if (classificationMode === "SASSI_LT") {
        if (initials === "LT") {
          availableAreas += 1;
          classifiedAreas += 1;
          continue;
        }
        continue;
      }

      if (initials && defaultSoles.has(initials)) {
        availableAreas += 1;
        classifiedAreas += 1;
        continue;
      }

      if (initials && initials !== "N/A") {
        classifiedAreas += 1;
      }
    }

    const unclassifiedAreas = Math.max(reportableAreas.length - classifiedAreas, 0);

    let builtAreas = 0;
    if (classificationMode === "SASSI_LT") {
      builtAreas = reportableAreas.filter(area => {
        if (area.isFusion) return false;
        const { initials } = resolveUseType(area.useType);
        return initials === "LT-CR";
      }).length;
    } else {
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
      const { label: landUseName, initials: landUseInitials } = resolveUseType(area.useType);
      const rowKey = normalizeKey(landUseName);
      if (!rowsByUseType.has(rowKey)) {
        rowsByUseType.set(rowKey, createRow(landUseName, landUseInitials));
      }

      const row = rowsByUseType.get(rowKey);
      if (!row) {
        continue;
      }

      const zoneName = resolveZoneName(area.zone);
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

    const lastPrivateAreaUpdate = privateAreaLastUpdate?.updatedAt ?? null;
    const lastPrivateAreaUpdatedBy = privateAreaLastUpdate?.updatedBy ?? null;

    const lastUpdatedAt =
      lastPrivateAreaUpdate && lastPrivateAreaUpdate > condominium.updatedAt
        ? lastPrivateAreaUpdate
        : condominium.updatedAt;

    const lastUpdatedBy =
      lastPrivateAreaUpdate && lastPrivateAreaUpdate > condominium.updatedAt
        ? lastPrivateAreaUpdatedBy
        : condominium.updatedBy;

    // Para el total de áreas privativas (lotes totales) usamos el conteo real
    // de áreas padre activas en lugar del campo estático Project.totalApoles,
    // que nunca se actualiza automáticamente cuando se agregan nuevas áreas.
    const realTotalApoles = parentAreas.length;

    return {
      condominiumId: condominium.id,
      condominiumName: condominium.name,
      condominiumSlug: condominium.slug,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectTotalApoles: realTotalApoles,
      projectPrivateAreasM2: decimalToNumber(project?.privateAreasM2),
      projectTotalM2: decimalToNumber(project?.totalM2),
      projectCommonAreasM2: decimalToNumber(project?.commonAreasM2),
      totalRegisteredPrivateAreas,
      activePrivateAreas,
      inactivePrivateAreas,
      activeParents,
      activeChildren,
      inactiveParents,
      inactiveChildren,
      areasWithUseType,
      areasWithoutUseType,
      totalPrivateAreaM2,
      totalApoleAreaM2,
      totalBuiltAreaM2,
      totalIndiviso,
      availableAreas,
      builtAreas,
      parentAreasCount,
      parentAreasM2,
      parentAreasCommonM2,
      activeFusionsCount,
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
      lastUpdatedBy,
      generatedAt: new Date(),
    };
  }
}
