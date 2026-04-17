import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type { ZoneListing } from "../domain/zone-listing";
import type { ZoneListingRepository } from "../domain/zone-listing.repository";

export class PrismaZoneListingRepository implements ZoneListingRepository {
  async getListing(): Promise<ZoneListing | null> {
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

    const [zones, activeSubzones] = await Promise.all([
      prisma.zoneCatalog.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          initials: true,
        },
        orderBy: [{ name: "asc" }, { initials: "asc" }],
      }),
      prisma.subzoneCatalog.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        select: {
          zoneId: true,
        },
      }),
    ]);

    const subzoneCountByZoneId = new Map<string, number>();

    for (const subzone of activeSubzones) {
      if (!subzone.zoneId) {
        continue;
      }

      const current = subzoneCountByZoneId.get(subzone.zoneId) ?? 0;
      subzoneCountByZoneId.set(subzone.zoneId, current + 1);
    }

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      zones: zones.map((zone) => {
        const activeSubzonesCount = subzoneCountByZoneId.get(zone.id) ?? 0;

        return {
          id: zone.id,
          name: zone.name,
          initials: zone.initials,
          activeSubzones: activeSubzonesCount,
          canDelete: activeSubzonesCount === 0,
        };
      }),
    };
  }
}
