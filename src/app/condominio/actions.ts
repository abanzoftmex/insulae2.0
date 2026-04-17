"use server";

import { revalidatePath } from "next/cache";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

export interface UpdateCondominioSettingsInput {
  projectId: string;
  projectName: string;
  projectInitials: string;
  projectDescription: string;
  privacyNoticeText: string;
  startYear: string;
  condominiumFormatId: string;
  totalM2: string;
  totalApoles: string;
  commonAreasM2: string;
  developedBy: string;
  usesLandUseFormula: boolean;
  hasVccc: boolean;
  footerLeft: string;
  footerRight: string;
  condominiumLogoUrl: string;
  condominiumImageUrl: string;
  footerLogoUrl: string;
  privacyNoticePdfUrl: string;
}

function toNullableInt(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableDecimal(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function updateCondominioSettingsAction(
  input: UpdateCondominioSettingsInput,
): Promise<{ ok: boolean; message: string }> {
  try {
    const condominium = await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: { id: true },
    });

    if (!condominium) {
      return { ok: false, message: "No se encontro el condominio configurado." };
    }

    const existingProject =
      (input.projectId
        ? await prisma.project.findFirst({
            where: {
              id: input.projectId,
              condominiumId: condominium.id,
            },
            select: { id: true },
          })
        : null) ??
      (await prisma.project.findFirst({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        orderBy: { id: "desc" },
        select: { id: true },
      }));

    if (!existingProject) {
      await prisma.project.create({
        data: {
          condominiumId: condominium.id,
          name: input.projectName.trim() || PROJECT_SCOPE.condominiumName,
          initials: toNullableString(input.projectInitials),
          description: toNullableString(input.projectDescription),
          privacyNoticeText: toNullableString(input.privacyNoticeText),
          startYear: toNullableInt(input.startYear),
          condominiumFormatId: toNullableInt(input.condominiumFormatId),
          totalM2: toNullableDecimal(input.totalM2),
          totalApoles: toNullableInt(input.totalApoles),
          commonAreasM2: toNullableDecimal(input.commonAreasM2),
          developedBy: toNullableString(input.developedBy),
          usesLandUseFormula: input.usesLandUseFormula,
          hasVccc: input.hasVccc,
          footerLeft: toNullableString(input.footerLeft),
          footerRight: toNullableString(input.footerRight),
          condominiumLogoUrl: toNullableString(input.condominiumLogoUrl),
          condominiumImageUrl: toNullableString(input.condominiumImageUrl),
          footerLogoUrl: toNullableString(input.footerLogoUrl),
          privacyNoticePdfUrl: toNullableString(input.privacyNoticePdfUrl),
          isActive: true,
        },
      });
    } else {
      await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          name: input.projectName.trim() || PROJECT_SCOPE.condominiumName,
          initials: toNullableString(input.projectInitials),
          description: toNullableString(input.projectDescription),
          privacyNoticeText: toNullableString(input.privacyNoticeText),
          startYear: toNullableInt(input.startYear),
          condominiumFormatId: toNullableInt(input.condominiumFormatId),
          totalM2: toNullableDecimal(input.totalM2),
          totalApoles: toNullableInt(input.totalApoles),
          commonAreasM2: toNullableDecimal(input.commonAreasM2),
          developedBy: toNullableString(input.developedBy),
          usesLandUseFormula: input.usesLandUseFormula,
          hasVccc: input.hasVccc,
          footerLeft: toNullableString(input.footerLeft),
          footerRight: toNullableString(input.footerRight),
          condominiumLogoUrl: toNullableString(input.condominiumLogoUrl),
          condominiumImageUrl: toNullableString(input.condominiumImageUrl),
          footerLogoUrl: toNullableString(input.footerLogoUrl),
          privacyNoticePdfUrl: toNullableString(input.privacyNoticePdfUrl),
        },
      });
    }

    revalidatePath("/condominio");
    return { ok: true, message: "Cambios guardados correctamente." };
  } catch (error) {
    console.error("[CondominioActions] Failed to update settings", error);
    return { ok: false, message: "No se pudo guardar la configuracion." };
  }
}
