import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type { CondominiumStructureType } from "../domain/condominium-structure-listing";

export type ResolvedCondominium = {
  id: string;
  slug: string;
  name: string;
};

export function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function normalizeStructureType(value: number | null | undefined): CondominiumStructureType {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  return 0;
}

export function normalizeInteger(value: number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return Math.trunc(value);
}

export async function resolveCondominiumContext(): Promise<ResolvedCondominium | null> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    }));

  if (!condominium) {
    return null;
  }

  return {
    id: condominium.id,
    slug: condominium.slug,
    name: condominium.name,
  };
}
