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
      activePrivateAreas,
      inactivePrivateAreas,
      privateAreasWithUseType,
      privateAreaM2,
      activeUsers,
      projectDocumentCount,
    ] = await Promise.all([
      prisma.privateArea.count({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
      }),
      prisma.privateArea.count({
        where: {
          condominiumId: condominium.id,
          isActive: false,
        },
      }),
      prisma.privateArea.count({
        where: {
          condominiumId: condominium.id,
          useType: { not: null },
        },
      }),
      prisma.privateArea.aggregate({
        where: { condominiumId: condominium.id },
        _sum: { m2Original: true },
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
      condominiumLogoUrl: project?.condominiumLogoUrl ?? null,
      condominiumImageUrl: project?.condominiumImageUrl ?? null,
      footerLogoUrl: project?.footerLogoUrl ?? null,
      privacyNoticePdfUrl: project?.privacyNoticePdfUrl ?? null,
      footerLeft: project?.footerLeft ?? null,
      footerRight: project?.footerRight ?? null,
      developedBy: project?.developedBy ?? null,
      usesLandUseFormula: project?.usesLandUseFormula ?? false,
      hasVccc: project?.hasVccc ?? false,
      activePrivateAreas,
      inactivePrivateAreas,
      privateAreasWithUseType,
      totalPrivateAreaM2: decimalToNumber(privateAreaM2._sum.m2Original),
      activeUsers,
      projectDocumentCount,
      lastUpdatedAt: condominium.updatedAt,
    };
  }
}
