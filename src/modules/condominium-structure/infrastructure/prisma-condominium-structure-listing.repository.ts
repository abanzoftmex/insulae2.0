import { prisma } from "@/shared/infrastructure/db/prisma";

import type { CondominiumStructureListing } from "../domain/condominium-structure-listing";
import type { CondominiumStructureListingRepository } from "../domain/condominium-structure-listing.repository";
import { normalizeStructureType, resolveCondominiumContext } from "./prisma-condominium-structure.shared";

type StructurePositionRecord = {
  id: string;
  name: string;
  quantity: number;
  isAlternate: boolean;
};

type StructureGroupRecord = {
  id: string;
  legacyId: number | null;
  name: string;
  position: number;
  structureType: number;
  positions: StructurePositionRecord[];
};

type StructurePrismaAccess = {
  condominiumStructureGroup: {
    findMany: (args: unknown) => Promise<StructureGroupRecord[]>;
  };
};

export class PrismaCondominiumStructureListingRepository implements CondominiumStructureListingRepository {
  async getListing(): Promise<CondominiumStructureListing | null> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return null;
    }

    const structurePrisma = prisma as unknown as StructurePrismaAccess;

    const groups = await structurePrisma.condominiumStructureGroup.findMany({
      where: {
        condominiumId: condominium.id,
        isActive: true,
      },
      include: {
        positions: {
          where: { isActive: true },
          // Preserve legacy visual order first, then use app-level fallback ordering.
          orderBy: [{ legacyId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            quantity: true,
            isAlternate: true,
          },
        },
      },
      // Legacy listing had no explicit ORDER BY and effectively followed source IDs.
      orderBy: [{ legacyId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    });

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      rows: groups.map((group) => ({
        id: group.id,
        name: group.name,
        position: group.position,
        structureType: normalizeStructureType(group.structureType),
        conceptsLabel: group.positions.map((concept) => concept.name).join(", "),
        totalConcepts: group.positions.length,
        // Legacy rule: only groups without concepts can be deleted.
        canDelete: group.positions.length === 0,
        concepts: group.positions.map((concept) => ({
          id: concept.id,
          name: concept.name,
          quantity: concept.quantity,
          isAlternate: concept.isAlternate,
        })),
      })),
    };
  }
}
