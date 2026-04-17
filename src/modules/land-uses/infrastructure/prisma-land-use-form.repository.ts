import type { Prisma } from "@prisma/client";

import {
  CHARGE_GROUP_KIND,
  resolveChargeGroupKind,
} from "@/shared/domain/charge-group-kind";
import { PRIVATE_AREA_STATUS } from "@/shared/domain/private-area-status";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  LandUseCommandResult,
  LandUseFormSnapshot,
  LandUseFormTemplate,
  SaveLandUseInput,
} from "../domain/land-use-form";
import type { LandUseFormRepository } from "../domain/land-use-form.repository";
import {
  buildChargeColumns,
  computeInitials,
  computeRepresentativeCharge,
  decimalToNumber,
  emptyChargeValues,
  normalizeKey,
  normalizeLabel,
  resolveAreaM2,
  resolveCondominiumContext,
  resolveLandUseIdByArea,
  roundCurrency,
  toColumnKey,
  type ChargeGroupSnapshot,
  type LandUseCatalogSnapshot,
  type PrivateAreaSnapshot,
} from "./prisma-land-use.shared";

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function toOptionalNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
}

function resolveYearsFromStartsAt(startsAtList: Array<Date | null>): number[] {
  const years = new Set<number>();

  for (const startsAt of startsAtList) {
    if (startsAt) {
      years.add(startsAt.getUTCFullYear());
    }
  }

  if (years.size === 0) {
    years.add(new Date().getUTCFullYear());
  }

  if (years.size === 1) {
    const baseYear = years.values().next().value as number;
    years.add(baseYear + 1);
  }

  return [...years].sort((a, b) => a - b);
}

function countRoundedUnique(values: number[], fractionDigits: number): number {
  if (values.length === 0) {
    return 0;
  }

  const factor = 10 ** fractionDigits;
  const rounded = values.map((value) => Math.round((value + Number.EPSILON) * factor) / factor);
  return new Set(rounded).size;
}

function buildCatalogLookup(catalogs: LandUseCatalogSnapshot[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const catalog of catalogs) {
    const name = normalizeLabel(catalog.name, "");
    const initials = normalizeLabel(catalog.initials, "");

    if (name) {
      lookup.set(normalizeKey(name), catalog.id);
    }

    if (initials) {
      lookup.set(normalizeKey(initials), catalog.id);
    }
  }

  return lookup;
}

export class PrismaLandUseFormRepository implements LandUseFormRepository {
  private async resolveColumns(
    condominiumId: string,
    condominiumSlug: string,
  ): Promise<{ columns: ReturnType<typeof buildChargeColumns>; groups: ChargeGroupSnapshot[] }> {
    const [groupsRaw, startsAtRows] = await Promise.all([
      prisma.chargeGroup.findMany({
        where: {
          condominiumId,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          name: true,
          chargeType: true,
        },
        orderBy: [{ legacyId: "asc" }, { name: "asc" }],
      }),
      prisma.areaCharge.findMany({
        where: {
          condominiumId,
          isActive: true,
          chargeGroup: {
            isActive: true,
          },
        },
        select: {
          startsAt: true,
        },
      }),
    ]);

    const groups = groupsRaw as ChargeGroupSnapshot[];
    const years = resolveYearsFromStartsAt(startsAtRows.map((row) => row.startsAt));
    const isSassi = condominiumSlug.toLowerCase().includes("sassi");

    return {
      columns: buildChargeColumns(years, groups, isSassi),
      groups,
    };
  }

  async getTemplate(): Promise<LandUseFormTemplate | null> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return null;
    }

    const { columns } = await this.resolveColumns(condominium.id, condominium.slug);

    return {
      columns,
    };
  }

  async getById(id: string): Promise<LandUseFormSnapshot | null> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return null;
    }

    const landUseId = trimSafe(id);
    if (!landUseId) {
      return null;
    }

    const [landUse, columnData] = await Promise.all([
      prisma.landUseCatalog.findFirst({
        where: {
          id: landUseId,
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          initials: true,
          order: true,
          weight: true,
          percentage: true,
        },
      }),
      this.resolveColumns(condominium.id, condominium.slug),
    ]);
    const { columns, groups } = columnData;

    if (!landUse) {
      return null;
    }

    const [allLandUses, privateAreasRaw, areaChargesRaw, ledgerChargesRaw] = await Promise.all([
      prisma.landUseCatalog.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          order: true,
          name: true,
          initials: true,
          weight: true,
          percentage: true,
        },
      }),
      prisma.privateArea.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          status: { in: [PRIVATE_AREA_STATUS.AVAILABLE, PRIVATE_AREA_STATUS.RENTED] },
        },
        select: {
          id: true,
          status: true,
          useType: true,
          parentPrivateAreaId: true,
          m2Apole: true,
          m2Original: true,
          m2Construction: true,
        },
      }),
      prisma.areaCharge.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          privateArea: {
            isActive: true,
            status: { in: [PRIVATE_AREA_STATUS.AVAILABLE, PRIVATE_AREA_STATUS.RENTED] },
          },
          chargeGroup: {
            isActive: true,
          },
        },
        select: {
          privateAreaId: true,
          startsAt: true,
          amount: true,
          chargeGroup: {
            select: {
              id: true,
              chargeType: true,
            },
          },
        },
      }),
      prisma.charge.findMany({
        where: {
          condominiumId: condominium.id,
          privateArea: {
            isActive: true,
            status: { in: [PRIVATE_AREA_STATUS.AVAILABLE, PRIVATE_AREA_STATUS.RENTED] },
          },
          chargeGroup: {
            isActive: true,
          },
        },
        select: {
          privateAreaId: true,
          periodYear: true,
          amount: true,
          chargeGroup: {
            select: {
              id: true,
              chargeType: true,
            },
          },
        },
      }),
    ]);

    const catalogByKey = buildCatalogLookup(allLandUses as LandUseCatalogSnapshot[]);
    const privateAreas = privateAreasRaw as PrivateAreaSnapshot[];
    const privateAreaById = new Map(privateAreas.map((area) => [area.id, area]));

    const areaIds = new Set<string>();
    for (const area of privateAreas) {
      const areaLandUseId = resolveLandUseIdByArea(area, catalogByKey);
      if (areaLandUseId === landUse.id) {
        areaIds.add(area.id);
      }
    }

    const configuredValuesByColumn = new Map<string, number[]>();
    const ledgerValuesByColumn = new Map<string, number[]>();
    const ledgerPerMeterValuesByColumn = new Map<string, number[]>();
    const ledgerAreaCoverageByColumn = new Map<string, Set<string>>();

    for (const charge of areaChargesRaw) {
      if (!areaIds.has(charge.privateAreaId)) {
        continue;
      }

      const year = charge.startsAt?.getUTCFullYear();
      if (!year) {
        continue;
      }

      const key = toColumnKey(year, charge.chargeGroup.id);
      const values = configuredValuesByColumn.get(key) ?? [];
      values.push(decimalToNumber(charge.amount));
      configuredValuesByColumn.set(key, values);
    }

    for (const charge of ledgerChargesRaw) {
      if (!areaIds.has(charge.privateAreaId)) {
        continue;
      }

      const area = privateAreaById.get(charge.privateAreaId);
      if (!area) {
        continue;
      }

      const key = toColumnKey(charge.periodYear, charge.chargeGroup.id);
      const values = ledgerValuesByColumn.get(key) ?? [];
      values.push(decimalToNumber(charge.amount));
      ledgerValuesByColumn.set(key, values);

      const areaM2 = resolveAreaM2(area);
      if (areaM2 > 0) {
        const perMeterValues = ledgerPerMeterValuesByColumn.get(key) ?? [];
        perMeterValues.push(decimalToNumber(charge.amount) / areaM2);
        ledgerPerMeterValuesByColumn.set(key, perMeterValues);
      }

      const coverage = ledgerAreaCoverageByColumn.get(key) ?? new Set<string>();
      coverage.add(charge.privateAreaId);
      ledgerAreaCoverageByColumn.set(key, coverage);
    }

    const charges = emptyChargeValues(columns).map((cell) => {
      const configuredRepresentative = computeRepresentativeCharge(
        configuredValuesByColumn.get(cell.key) ?? [],
      );
      const ledgerRepresentative = computeRepresentativeCharge(ledgerValuesByColumn.get(cell.key) ?? []);
      const ledgerPerMeterRepresentative = computeRepresentativeCharge(
        ledgerPerMeterValuesByColumn.get(cell.key) ?? [],
      );
      const ledgerAreaCoverage = ledgerAreaCoverageByColumn.get(cell.key)?.size ?? 0;
      const coverageRatio = areaIds.size > 0 ? ledgerAreaCoverage / areaIds.size : 0;
      const chargeGroup = groups.find((group) => group.id === cell.chargeGroupId) ?? null;
      const chargeGroupKind = chargeGroup ? resolveChargeGroupKind(chargeGroup) : CHARGE_GROUP_KIND.OTHER;

      let representative = configuredRepresentative;

      if (chargeGroupKind === CHARGE_GROUP_KIND.ORDINARY) {
        if (configuredRepresentative.amount > 0) {
          representative = configuredRepresentative;
        } else if ((ledgerValuesByColumn.get(cell.key) ?? []).length > 0) {
          const rawValues = ledgerValuesByColumn.get(cell.key) ?? [];
          const perMeterValues = ledgerPerMeterValuesByColumn.get(cell.key) ?? [];
          const rawUnique = countRoundedUnique(rawValues, 2);
          const perMeterUnique = countRoundedUnique(perMeterValues, 4);

          representative =
            perMeterValues.length > 0 &&
            ledgerPerMeterRepresentative.amount > 0 &&
            perMeterUnique > 0 &&
            perMeterUnique < rawUnique
              ? {
                  amount: ledgerPerMeterRepresentative.amount,
                  applicationMode: "PER_METER",
                }
              : ledgerRepresentative;
        } else {
          representative = configuredRepresentative;
        }
      }

      if (chargeGroupKind === CHARGE_GROUP_KIND.EXTRA_CONDO) {
        representative =
          coverageRatio >= 0.65
            ? ledgerRepresentative
            : { amount: 0, applicationMode: "ONE_TIME" };
      }

      return {
        ...cell,
        amount: representative.amount,
        applicationMode: representative.applicationMode,
      };
    });

    return {
      id: landUse.id,
      name: landUse.name,
      initials: landUse.initials,
      order: landUse.order,
      weight: toOptionalNumber(decimalToNumber(landUse.weight)),
      percentage: toOptionalNumber(decimalToNumber(landUse.percentage)),
      columns,
      charges,
    };
  }

  async save(input: SaveLandUseInput): Promise<LandUseCommandResult> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return {
        ok: false,
        message: "No se encontro un condominio activo.",
      };
    }

    const name = trimSafe(input.name);
    if (!name) {
      return {
        ok: false,
        message: "El nombre del uso de suelo es obligatorio.",
      };
    }

    const initialsInput = trimSafe(input.initials);
    const initials = initialsInput || computeInitials(name);

    let landUseId = trimSafe(input.id);

    if (landUseId) {
      const existing = await prisma.landUseCatalog.findFirst({
        where: {
          id: landUseId,
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return {
          ok: false,
          message: "El uso de suelo que intentas editar ya no existe.",
        };
      }

      const duplicated = await prisma.landUseCatalog.findFirst({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: {
            id: landUseId,
          },
        },
        select: { id: true },
      });

      if (duplicated) {
        return {
          ok: false,
          message: "Ya existe otro uso de suelo activo con ese nombre.",
        };
      }

      await prisma.landUseCatalog.update({
        where: { id: landUseId },
        data: {
          name,
          initials,
          order: input.order ?? null,
          weight: input.weight ?? null,
          percentage: input.percentage ?? null,
        },
      });
    } else {
      const duplicated = await prisma.landUseCatalog.findFirst({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicated) {
        return {
          ok: false,
          message: "Ya existe un uso de suelo activo con ese nombre.",
        };
      }

      const created = await prisma.landUseCatalog.create({
        data: {
          condominiumId: condominium.id,
          name,
          initials,
          order: input.order ?? null,
          weight: input.weight ?? null,
          percentage: input.percentage ?? null,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      landUseId = created.id;
    }

    const [allLandUses, chargeGroups, privateAreasRaw] = await Promise.all([
      prisma.landUseCatalog.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          order: true,
          name: true,
          initials: true,
          weight: true,
          percentage: true,
        },
      }),
      prisma.chargeGroup.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          name: true,
          chargeType: true,
        },
      }),
      prisma.privateArea.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
          status: { in: [PRIVATE_AREA_STATUS.AVAILABLE, PRIVATE_AREA_STATUS.RENTED] },
        },
        select: {
          id: true,
          status: true,
          useType: true,
          parentPrivateAreaId: true,
          m2Apole: true,
          m2Original: true,
          m2Construction: true,
        },
      }),
    ]);

    const catalogByKey = buildCatalogLookup(allLandUses as LandUseCatalogSnapshot[]);
    const privateAreas = privateAreasRaw as PrivateAreaSnapshot[];

    const targetAreaIds: string[] = [];
    const privateAreaById = new Map<string, PrivateAreaSnapshot>();

    for (const area of privateAreas) {
      privateAreaById.set(area.id, area);

      const areaLandUseId = resolveLandUseIdByArea(area, catalogByKey);
      if (areaLandUseId === landUseId) {
        targetAreaIds.push(area.id);
      }
    }

    if (targetAreaIds.length > 0 && input.charges.length > 0) {
      const chargeGroupIds = new Set(
        (chargeGroups as ChargeGroupSnapshot[]).map((group) => group.id),
      );

      for (const chargeInput of input.charges) {
        if (!Number.isFinite(chargeInput.amount) || chargeInput.amount < 0) {
          continue;
        }

        const chargeGroupId = trimSafe(chargeInput.chargeGroupId);
        if (!chargeGroupId || !chargeGroupIds.has(chargeGroupId)) {
          continue;
        }

        const startsAt = new Date(Date.UTC(chargeInput.year, 0, 1));
        const endsAt = new Date(Date.UTC(chargeInput.year, 11, 31, 23, 59, 59, 999));

        const existingCharges = await prisma.areaCharge.findMany({
          where: {
            condominiumId: condominium.id,
            privateAreaId: {
              in: targetAreaIds,
            },
            chargeGroupId,
            startsAt,
          },
          select: {
            id: true,
            privateAreaId: true,
          },
        });

        const existingByAreaId = new Map(existingCharges.map((item) => [item.privateAreaId, item.id]));
        const operations: Prisma.PrismaPromise<unknown>[] = [];

        for (const areaId of targetAreaIds) {
          const area = privateAreaById.get(areaId);
          if (!area) {
            continue;
          }

          const amount =
            chargeInput.applicationMode === "PER_METER"
              ? roundCurrency(chargeInput.amount * resolveAreaM2(area))
              : roundCurrency(chargeInput.amount);

          const existingId = existingByAreaId.get(areaId);
          if (existingId) {
            operations.push(
              prisma.areaCharge.update({
                where: { id: existingId },
                data: {
                  amount,
                  endsAt,
                  isActive: true,
                },
              }),
            );
          } else {
            operations.push(
              prisma.areaCharge.create({
                data: {
                  condominiumId: condominium.id,
                  privateAreaId: areaId,
                  chargeGroupId,
                  amount,
                  startsAt,
                  endsAt,
                  isActive: true,
                },
              }),
            );
          }
        }

        if (operations.length > 0) {
          await prisma.$transaction(operations);
        }
      }
    }

    return {
      ok: true,
      message: input.id ? "Uso de suelo actualizado correctamente." : "Uso de suelo creado correctamente.",
      landUseId,
    };
  }
}
