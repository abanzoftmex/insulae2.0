import type { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import {
  CHARGE_GROUP_KIND,
  resolveChargeGroupKind,
} from "@/shared/domain/charge-group-kind";
import type { PrivateAreaStatus } from "@/shared/domain/private-area-status";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  LandUseApplicationMode,
  LandUseChargeColumn,
  LandUseChargeValue,
} from "../domain/land-use-listing";

export type ResolvedCondominium = {
  id: string;
  slug: string;
  name: string;
  usesLandUseFormula: boolean;
};

export type ChargeGroupSnapshot = {
  id: string;
  legacyId: number | null;
  name: string;
  chargeType: string | null;
};

export type LandUseCatalogSnapshot = {
  id: string;
  legacyId: number | null;
  order: number | null;
  name: string;
  initials: string | null;
  weight: Prisma.Decimal | number | null;
  percentage: Prisma.Decimal | number | null;
};

export type PrivateAreaSnapshot = {
  id: string;
  status: PrivateAreaStatus;
  useType: string | null;
  parentPrivateAreaId: string | null;
  m2Apole: Prisma.Decimal | number | null;
  m2Original: Prisma.Decimal | number | null;
  m2Construction: Prisma.Decimal | number | null;
};

export type AreaChargeSnapshot = {
  privateAreaId: string;
  startsAt: Date | null;
  amount: Prisma.Decimal | number;
  chargeGroupId: string;
};

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

export function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function computeInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase();

  if (words) {
    return words;
  }

  return name.slice(0, 4).toUpperCase();
}

export function toColumnKey(year: number, chargeGroupId: string): string {
  return `${year}:${chargeGroupId}`;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toChargeGroupsForYear(
  year: number,
  groups: ChargeGroupSnapshot[],
  isSassi: boolean,
): ChargeGroupSnapshot[] {
  if (isSassi || year < 2026) {
    return groups;
  }

  const ordinariasOnly = groups.filter(
    (group) => resolveChargeGroupKind(group) === CHARGE_GROUP_KIND.ORDINARY,
  );
  return ordinariasOnly.length > 0 ? ordinariasOnly : groups;
}

export function buildChargeColumns(
  years: number[],
  groups: ChargeGroupSnapshot[],
  isSassi: boolean,
): LandUseChargeColumn[] {
  const sortedYears = [...new Set(years)].sort((a, b) => a - b);

  const columns: LandUseChargeColumn[] = [];
  for (const year of sortedYears) {
    for (const group of toChargeGroupsForYear(year, groups, isSassi)) {
      columns.push({
        key: toColumnKey(year, group.id),
        year,
        chargeGroupId: group.id,
        chargeGroupName: group.name,
        label: `${group.name} ${year}`,
      });
    }
  }

  return columns;
}

export function computeRepresentativeCharge(
  values: number[],
): { amount: number; applicationMode: LandUseApplicationMode } {
  if (values.length === 0) {
    return {
      amount: 0,
      applicationMode: "ONE_TIME",
    };
  }

  const rounded = values.map((value) => roundCurrency(value));
  const frequencies = new Map<number, number>();

  for (const value of rounded) {
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  }

  let bestAmount = rounded[0] ?? 0;
  let bestFrequency = frequencies.get(bestAmount) ?? 0;

  for (const [amount, frequency] of frequencies) {
    if (frequency > bestFrequency) {
      bestAmount = amount;
      bestFrequency = frequency;
    }
  }

  return {
    amount: bestAmount,
    applicationMode: frequencies.size > 1 ? "PER_METER" : "ONE_TIME",
  };
}

export function resolveLandUseIdByArea(
  area: Pick<PrivateAreaSnapshot, "useType">,
  catalogByKey: Map<string, string>,
): string | null {
  const normalized = normalizeKey(normalizeLabel(area.useType, ""));
  if (!normalized) {
    return null;
  }

  return catalogByKey.get(normalized) ?? null;
}

export function resolveAreaM2(area: PrivateAreaSnapshot): number {
  if (area.parentPrivateAreaId) {
    return decimalToNumber(area.m2Construction);
  }

  const fromApole = decimalToNumber(area.m2Apole);
  if (fromApole > 0) {
    return fromApole;
  }

  return decimalToNumber(area.m2Original);
}

export function emptyChargeValues(columns: LandUseChargeColumn[]): LandUseChargeValue[] {
  return columns.map((column) => ({
    key: column.key,
    year: column.year,
    chargeGroupId: column.chargeGroupId,
    chargeGroupName: column.chargeGroupName,
    amount: 0,
    applicationMode: "ONE_TIME",
  }));
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

  const project = await prisma.project.findFirst({
    where: {
      condominiumId: condominium.id,
      isActive: true,
    },
    orderBy: [{ legacyId: "desc" }],
    select: {
      usesLandUseFormula: true,
    },
  });

  return {
    id: condominium.id,
    slug: condominium.slug,
    name: condominium.name,
    usesLandUseFormula: project?.usesLandUseFormula ?? false,
  };
}
