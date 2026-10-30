import { cache } from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

/** Condominio del portal (alcance Valquirico-only). Memorizado por petición. */
export const getMinisitioCondominium = cache(async () =>
  prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true, name: true },
  }),
);

/** Proyecto activo del condominio. Memorizado por petición. */
export const getActiveProject = cache(async (condominiumId: string) =>
  prisma.project.findFirst({
    where: { condominiumId, isActive: true },
    select: {
      id: true,
      name: true,
      totalM2: true,
      condominiumLogoUrl: true,
      privacyNoticeText: true,
      privacyNoticePdfUrl: true,
      footerLeft: true,
      footerRight: true,
    },
  }),
);

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
