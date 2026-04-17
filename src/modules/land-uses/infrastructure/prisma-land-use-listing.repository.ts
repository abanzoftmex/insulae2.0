import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  CHARGE_GROUP_KIND,
  resolveChargeGroupKind,
} from "@/shared/domain/charge-group-kind";
import {
  PRIVATE_AREA_STATUS,
} from "@/shared/domain/private-area-status";

import type { LandUseListing } from "../domain/land-use-listing";
import type { LandUseListingRepository } from "../domain/land-use-listing.repository";
import {
  buildChargeColumns,
  computeRepresentativeCharge,
  decimalToNumber,
  normalizeKey,
  normalizeLabel,
  resolveAreaM2,
  resolveCondominiumContext,
  resolveLandUseIdByArea,
  toColumnKey,
  type ChargeGroupSnapshot,
  type LandUseCatalogSnapshot,
  type PrivateAreaSnapshot,
} from "./prisma-land-use.shared";

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

function resolveYearsFromCharges(chargeStartsAt: Array<Date | null>): number[] {
  const yearSet = new Set<number>();

  for (const startsAt of chargeStartsAt) {
    if (startsAt) {
      yearSet.add(startsAt.getUTCFullYear());
    }
  }

  if (yearSet.size === 0) {
    yearSet.add(new Date().getUTCFullYear());
  }

  if (yearSet.size === 1) {
    const onlyYear = yearSet.values().next().value as number;
    yearSet.add(onlyYear + 1);
  }

  return [...yearSet].sort((a, b) => a - b);
}

function countRoundedUnique(values: number[], fractionDigits: number): number {
  if (values.length === 0) {
    return 0;
  }

  const factor = 10 ** fractionDigits;
  const rounded = values.map((value) => Math.round((value + Number.EPSILON) * factor) / factor);
  return new Set(rounded).size;
}

export class PrismaLandUseListingRepository implements LandUseListingRepository {
  async getListing(): Promise<LandUseListing | null> {
    const condominium = await resolveCondominiumContext();

    if (!condominium) {
      return null;
    }

    const [landUses, chargeGroupsRaw, privateAreas, areaChargesRaw, ledgerChargesRaw] = await Promise.all([
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
        orderBy: [{ order: "asc" }, { legacyId: "asc" }, { name: "asc" }],
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
        orderBy: [{ legacyId: "asc" }, { name: "asc" }],
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

    const catalogs = landUses as LandUseCatalogSnapshot[];
    const chargeGroups = chargeGroupsRaw as ChargeGroupSnapshot[];
    const activeAreas = privateAreas as PrivateAreaSnapshot[];

    const isSassi = condominium.slug.toLowerCase().includes("sassi");
    const years = resolveYearsFromCharges(areaChargesRaw.map((charge) => charge.startsAt));
    const columns = buildChargeColumns(years, chargeGroups, isSassi);

    const areaById = new Map(activeAreas.map((area) => [area.id, area]));
    const catalogByKey = buildCatalogLookup(catalogs);

    const areaIdsByLandUse = new Map<string, Set<string>>();
    for (const catalog of catalogs) {
      areaIdsByLandUse.set(catalog.id, new Set());
    }

    for (const area of activeAreas) {
      const landUseId = resolveLandUseIdByArea(area, catalogByKey);
      if (!landUseId) {
        continue;
      }

      const bucket = areaIdsByLandUse.get(landUseId);
      if (!bucket) {
        continue;
      }

      bucket.add(area.id);
    }

    const configuredValuesByLandUseAndColumn = new Map<string, number[]>();
    const ledgerValuesByLandUseAndColumn = new Map<string, number[]>();
    const ledgerPerMeterValuesByLandUseAndColumn = new Map<string, number[]>();
    const ledgerAreaCoverageByLandUseAndColumn = new Map<string, Set<string>>();

    for (const charge of areaChargesRaw) {
      const area = areaById.get(charge.privateAreaId);
      if (!area) {
        continue;
      }

      const landUseId = resolveLandUseIdByArea(area, catalogByKey);
      if (!landUseId) {
        continue;
      }

      const year = charge.startsAt?.getUTCFullYear();
      if (!year) {
        continue;
      }

      const columnKey = toColumnKey(year, charge.chargeGroup.id);
      const rowKey = `${landUseId}:${columnKey}`;

      if (!columns.some((column) => column.key === columnKey)) {
        continue;
      }

      const amount = decimalToNumber(charge.amount);
      const values = configuredValuesByLandUseAndColumn.get(rowKey) ?? [];
      values.push(amount);
      configuredValuesByLandUseAndColumn.set(rowKey, values);
    }

    for (const charge of ledgerChargesRaw) {
      const area = areaById.get(charge.privateAreaId);
      if (!area) {
        continue;
      }

      const landUseId = resolveLandUseIdByArea(area, catalogByKey);
      if (!landUseId) {
        continue;
      }

      const columnKey = toColumnKey(charge.periodYear, charge.chargeGroup.id);
      const rowKey = `${landUseId}:${columnKey}`;

      if (!columns.some((column) => column.key === columnKey)) {
        continue;
      }

      const values = ledgerValuesByLandUseAndColumn.get(rowKey) ?? [];
      values.push(decimalToNumber(charge.amount));
      ledgerValuesByLandUseAndColumn.set(rowKey, values);

      const areaM2 = resolveAreaM2(area);
      if (areaM2 > 0) {
        const perMeterValues = ledgerPerMeterValuesByLandUseAndColumn.get(rowKey) ?? [];
        perMeterValues.push(decimalToNumber(charge.amount) / areaM2);
        ledgerPerMeterValuesByLandUseAndColumn.set(rowKey, perMeterValues);
      }

      const areaCoverage = ledgerAreaCoverageByLandUseAndColumn.get(rowKey) ?? new Set<string>();
      areaCoverage.add(charge.privateAreaId);
      ledgerAreaCoverageByLandUseAndColumn.set(rowKey, areaCoverage);
    }

    const rows = catalogs
      .map((catalog) => {
        const areaIds = areaIdsByLandUse.get(catalog.id) ?? new Set<string>();

        let totalM2 = 0;
        for (const areaId of areaIds) {
          const area = areaById.get(areaId);
          if (!area) {
            continue;
          }

          totalM2 += resolveAreaM2(area);
        }

        const charges = columns.map((column) => {
          const rowKey = `${catalog.id}:${column.key}`;
          const configuredValues = configuredValuesByLandUseAndColumn.get(rowKey) ?? [];
          const ledgerValues = ledgerValuesByLandUseAndColumn.get(rowKey) ?? [];
          const ledgerPerMeterValues = ledgerPerMeterValuesByLandUseAndColumn.get(rowKey) ?? [];

          const configuredRepresentative = computeRepresentativeCharge(configuredValues);
          const ledgerRepresentative = computeRepresentativeCharge(ledgerValues);
          const ledgerPerMeterRepresentative = computeRepresentativeCharge(ledgerPerMeterValues);
          const ledgerAreaCoverage = ledgerAreaCoverageByLandUseAndColumn.get(rowKey)?.size ?? 0;
          const coverageRatio = areaIds.size > 0 ? ledgerAreaCoverage / areaIds.size : 0;
          const chargeGroup = chargeGroups.find((group) => group.id === column.chargeGroupId) ?? null;
          const chargeGroupKind = chargeGroup ? resolveChargeGroupKind(chargeGroup) : CHARGE_GROUP_KIND.OTHER;

          let selected = configuredRepresentative;

          // Legacy parity: cuotas ordinarias salen del ledger (PAGOS migrado),
          // pero si existe un valor configurado no-cero en AreaCharge, se respeta.
          if (chargeGroupKind === CHARGE_GROUP_KIND.ORDINARY) {
            if (configuredRepresentative.amount > 0) {
              selected = configuredRepresentative;
            } else if (ledgerValues.length > 0) {
              const rawUnique = countRoundedUnique(ledgerValues, 2);
              const perMeterUnique = countRoundedUnique(ledgerPerMeterValues, 4);

              selected =
                ledgerPerMeterValues.length > 0 &&
                ledgerPerMeterRepresentative.amount > 0 &&
                perMeterUnique > 0 &&
                perMeterUnique < rawUnique
                  ? {
                      amount: ledgerPerMeterRepresentative.amount,
                      applicationMode: "PER_METER",
                    }
                  : ledgerRepresentative;
            } else {
              selected = configuredRepresentative;
            }
          }

          // Legacy parity: extraordinarias-condominos se muestran como base cero
          // salvo que el cargo exista de forma extendida en la operacion de ese uso.
          if (chargeGroupKind === CHARGE_GROUP_KIND.EXTRA_CONDO) {
            selected = coverageRatio >= 0.65 ? ledgerRepresentative : { amount: 0, applicationMode: "ONE_TIME" };
          }

          return {
            key: column.key,
            year: column.year,
            chargeGroupId: column.chargeGroupId,
            chargeGroupName: column.chargeGroupName,
            amount: selected.amount,
            applicationMode: selected.applicationMode,
          };
        });

        return {
          id: catalog.id,
          legacyOrder: catalog.legacyId,
          order: catalog.order,
          name: catalog.name,
          initials: catalog.initials,
          totalAreas: areaIds.size,
          totalM2,
          canDelete: areaIds.size === 0,
          charges,
        };
      })
      .sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        const leftLegacy = left.legacyOrder ?? Number.MAX_SAFE_INTEGER;
        const rightLegacy = right.legacyOrder ?? Number.MAX_SAFE_INTEGER;

        if (leftLegacy !== rightLegacy) {
          return leftLegacy - rightLegacy;
        }

        return left.name.localeCompare(right.name, "es-MX");
      })
      .map((row) => {
        const { legacyOrder: _legacyOrder, ...rowWithoutLegacyOrder } = row;
        return rowWithoutLegacyOrder;
      });

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      usesLandUseFormula: condominium.usesLandUseFormula,
      columns,
      rows,
    };
  }
}
