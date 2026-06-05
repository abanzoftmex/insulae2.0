import type { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type { CondominiumOverview } from "../domain/condominium-overview";
import type { CondominiumOverviewRepository } from "../domain/condominium-overview.repository";

type ProjectSnapshot = {
  id?: string;
  name?: string;
  description?: string | null;
  initials?: string | null;
  privacyNoticeText?: string | null;
  startYear?: number | null;
  condominiumFormatId?: number | null;
  totalM2?: Prisma.Decimal | number | null;
  totalApoles?: number | null;
  commonAreasM2?: Prisma.Decimal | number | null;
  privateAreasM2?: Prisma.Decimal | number | null;
  condominiumLogoUrl?: string | null;
  condominiumImageUrl?: string | null;
  footerLogoUrl?: string | null;
  privacyNoticePdfUrl?: string | null;
  footerLeft?: string | null;
  footerRight?: string | null;
  developedBy?: string | null;
  usesLandUseFormula?: boolean | null;
  hasVccc?: boolean | null;
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

export class PrismaCondominiumOverviewRepository
  implements CondominiumOverviewRepository
{
  async getOverview(): Promise<CondominiumOverview | null> {
    const findByScopeWithLegacyFields = () =>
      prisma.condominium.findFirst({
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
              initials: true,
              description: true,
              privacyNoticeText: true,
              startYear: true,
              condominiumFormatId: true,
              totalM2: true,
              totalApoles: true,
              commonAreasM2: true,
              privateAreasM2: true,
              condominiumLogoUrl: true,
              condominiumImageUrl: true,
              footerLogoUrl: true,
              privacyNoticePdfUrl: true,
              footerLeft: true,
              footerRight: true,
              developedBy: true,
              usesLandUseFormula: true,
              hasVccc: true,
            },
          },
        },
      });

    const findAnyActiveWithLegacyFields = () =>
      prisma.condominium.findFirst({
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
              initials: true,
              description: true,
              privacyNoticeText: true,
              startYear: true,
              condominiumFormatId: true,
              totalM2: true,
              totalApoles: true,
              commonAreasM2: true,
              privateAreasM2: true,
              condominiumLogoUrl: true,
              condominiumImageUrl: true,
              footerLogoUrl: true,
              privacyNoticePdfUrl: true,
              footerLeft: true,
              footerRight: true,
              developedBy: true,
              usesLandUseFormula: true,
              hasVccc: true,
            },
          },
        },
      });

    const findByScopeMinimal = () =>
      prisma.condominium.findFirst({
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
              description: true,
            },
          },
        },
      });

    const findAnyActiveMinimal = () =>
      prisma.condominium.findFirst({
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
              description: true,
            },
          },
        },
      });

    let condominium:
      | Awaited<ReturnType<typeof findByScopeWithLegacyFields>>
      | Awaited<ReturnType<typeof findByScopeMinimal>>;

    try {
      condominium = await findByScopeWithLegacyFields();
      if (!condominium) {
        condominium = await findAnyActiveWithLegacyFields();
      }
    } catch (error) {
      console.warn(
        "[CondominiumOverview] Falling back to minimal project fields. Check DB schema sync.",
        error,
      );
      condominium = await findByScopeMinimal();
      if (!condominium) {
        condominium = await findAnyActiveMinimal();
      }
    }

    if (!condominium) {
      return null;
    }

    const project = (condominium.projects[0] ?? null) as ProjectSnapshot | null;

    const [
      allPrivateAreas,
      activeUsers,
      projectDocumentCount,
    ] = await Promise.all([
      prisma.privateArea.findMany({
        where: { condominiumId: condominium.id },
        select: {
          id: true,
          name: true,
          isActive: true,
          isFusion: true,
          status: true,
          useType: true,
          m2Original: true,
          parentPrivateAreaId: true,
          parentPrivateArea: {
            select: { isFusion: true },
          },
        },
      }),
      prisma.user.count({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
      }),
      prisma.projectDocument.count({
        where: {
          project: {
            condominiumId: condominium.id,
          },
        },
      }),
    ]);

    // Un "área reportable" es simplemente un área activa (mismo criterio que
    // /reporte-cuotas: isActive = true). Antes se exigía además
    // status ∈ {AVAILABLE, SOLD, RENTED}, pero ese estatus comercial nunca se
    // puebla desde la app (se crea fijo en UNASSIGNED y no hay UI para
    // cambiarlo), por lo que el conteo quedaba en 0 pese a haber áreas activas.
    // El filtro de jerarquía (no-fusión / raíz) de abajo es el que distingue
    // APoLes (áreas padre) de FAPs (fracciones).
    const reportableAreas = allPrivateAreas.filter((area) => area.isActive);

    const activeParentAreas = reportableAreas.filter(
      (area) =>
        !area.isFusion &&
        (area.parentPrivateAreaId === null ||
          (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
    );

    const inactiveParentAreas = allPrivateAreas.filter(
      (area) =>
        !area.isActive &&
        !area.isFusion &&
        (area.parentPrivateAreaId === null ||
          (area.parentPrivateArea?.isFusion === true && !area.name.includes("-")))
    );

    const privateAreasWithUseType = reportableAreas.filter(
      (area) => area.useType && area.useType.trim().length > 0
    );

    const activePrivateAreas = activeParentAreas.length;
    const inactivePrivateAreas = inactiveParentAreas.length;
    const privateAreasWithUseTypeCount = privateAreasWithUseType.length;
    const totalPrivateAreaM2 = activeParentAreas.reduce(
      (acc, area) => acc + decimalToNumber(area.m2Original),
      0
    );

    return {
      condominiumId: condominium.id,
      condominiumName: condominium.name,
      condominiumSlug: condominium.slug,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      projectInitials: project?.initials ?? null,
      projectDescription: project?.description ?? null,
      privacyNoticeText: project?.privacyNoticeText ?? null,
      startYear: project?.startYear ?? null,
      condominiumFormatId: project?.condominiumFormatId ?? null,
      totalM2: decimalToNumber(project?.totalM2),
      totalApoles: project?.totalApoles ?? 0,
      commonAreasM2: decimalToNumber(project?.commonAreasM2),
      privateAreasM2: decimalToNumber(project?.privateAreasM2),
      developedBy: project?.developedBy ?? null,
      condominiumLogoUrl: project?.condominiumLogoUrl ?? null,
      condominiumImageUrl: project?.condominiumImageUrl ?? null,
      footerLogoUrl: project?.footerLogoUrl ?? null,
      privacyNoticePdfUrl: project?.privacyNoticePdfUrl ?? null,
      footerLeft: project?.footerLeft ?? null,
      footerRight: project?.footerRight ?? null,
      usesLandUseFormula: project?.usesLandUseFormula ?? false,
      hasVccc: project?.hasVccc ?? false,
      activePrivateAreas,
      inactivePrivateAreas,
      privateAreasWithUseType: privateAreasWithUseTypeCount,
      totalPrivateAreaM2: totalPrivateAreaM2,
      activeUsers,
      projectDocumentCount,
      lastUpdatedAt: condominium.updatedAt,
    };
  }
}
