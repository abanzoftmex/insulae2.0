import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  CondominiumStructureCommandResult,
  CondominiumStructureFormSnapshot,
  CondominiumStructureFormTemplate,
  SaveCondominiumStructureInput,
} from "../domain/condominium-structure-form";
import type { CondominiumStructureFormRepository } from "../domain/condominium-structure-form.repository";
import {
  normalizeInteger,
  normalizeStructureType,
  resolveCondominiumContext,
  trimSafe,
} from "./prisma-condominium-structure.shared";

type StructurePrismaGroupDelegate = {
  findFirst: (args: unknown) => Promise<any>;
  update: (args: unknown) => Promise<any>;
  create: (args: unknown) => Promise<any>;
};

type StructurePrismaPositionDelegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string }>>;
  count: (args: unknown) => Promise<number>;
  update: (args: unknown) => Promise<any>;
  create: (args: unknown) => Promise<any>;
  updateMany: (args: unknown) => Promise<any>;
};

type StructurePrismaAccess = {
  condominiumStructureGroup: StructurePrismaGroupDelegate;
  condominiumStructurePosition: StructurePrismaPositionDelegate;
};

function toSafeQuantity(value: number | null | undefined): number {
  const parsed = normalizeInteger(value, 0);
  return parsed < 0 ? 0 : parsed;
}

export class PrismaCondominiumStructureFormRepository implements CondominiumStructureFormRepository {
  async getTemplate(): Promise<CondominiumStructureFormTemplate | null> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return null;
    }

    const structurePrisma = prisma as unknown as StructurePrismaAccess;

    const highestPosition = await structurePrisma.condominiumStructureGroup.findFirst({
      where: {
        condominiumId: condominium.id,
        isActive: true,
      },
      orderBy: [{ position: "desc" }],
      select: {
        position: true,
      },
    });

    return {
      suggestedPosition: (highestPosition?.position ?? 0) + 1,
    };
  }

  async getById(id: string): Promise<CondominiumStructureFormSnapshot | null> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return null;
    }

    const structurePrisma = prisma as unknown as StructurePrismaAccess;

    const groupId = trimSafe(id);
    if (!groupId) {
      return null;
    }

    const group = await structurePrisma.condominiumStructureGroup.findFirst({
      where: {
        id: groupId,
        condominiumId: condominium.id,
        isActive: true,
      },
      include: {
        positions: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            quantity: true,
            isAlternate: true,
          },
        },
      },
    });

    if (!group) {
      return null;
    }

    return {
      id: group.id,
      name: group.name,
      position: group.position,
      structureType: normalizeStructureType(group.structureType),
      concepts: group.positions.map((concept: { id: string; name: string; quantity: number; isAlternate: boolean }) => ({
        id: concept.id,
        name: concept.name,
        quantity: concept.quantity,
        isAlternate: concept.isAlternate,
      })),
    };
  }

  async save(input: SaveCondominiumStructureInput): Promise<CondominiumStructureCommandResult> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return {
        ok: false,
        message: "No hay un condominio activo para guardar la estructura.",
      };
    }

    const name = trimSafe(input.name);
    if (name.length < 2) {
      return {
        ok: false,
        message: "El nombre del grupo debe tener al menos 2 caracteres.",
      };
    }

    const structureType = normalizeStructureType(input.structureType ?? 0);
    const position = Math.max(0, normalizeInteger(input.position, 0));

    const rawConcepts = input.concepts.map((concept, index) => ({
      id: trimSafe(concept.id),
      name: trimSafe(concept.name),
      quantity: toSafeQuantity(concept.quantity),
      isAlternate: Boolean(concept.isAlternate),
      sortOrder: index,
    }));

    const concepts = rawConcepts.filter((concept) => concept.name.length > 0);

    if (rawConcepts.length > 0 && concepts.length === 0) {
      return {
        ok: false,
        message: "Agrega al menos un concepto valido o elimina los vacios antes de guardar.",
      };
    }

    const requestedId = trimSafe(input.id);

    const structurePrisma = prisma as unknown as StructurePrismaAccess;

    const saved = await prisma.$transaction(async (tx) => {
      const structureTx = tx as unknown as StructurePrismaAccess;

      const group = requestedId
        ? await structureTx.condominiumStructureGroup.findFirst({
            where: {
              id: requestedId,
              condominiumId: condominium.id,
              isActive: true,
            },
            select: { id: true },
          })
        : null;

      const targetGroup = group
        ? await structureTx.condominiumStructureGroup.update({
            where: { id: group.id },
            data: {
              name,
              position,
              structureType,
            },
            select: { id: true },
          })
        : await structureTx.condominiumStructureGroup.create({
            data: {
              condominiumId: condominium.id,
              name,
              position,
              structureType,
              isActive: true,
            },
            select: { id: true },
          });

      const existingConcepts = await structureTx.condominiumStructurePosition.findMany({
        where: {
          condominiumId: condominium.id,
          groupId: targetGroup.id,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      const existingIds = new Set(existingConcepts.map((concept) => concept.id));
      const retainedIds = new Set<string>();

      for (const concept of concepts) {
        if (concept.id && existingIds.has(concept.id)) {
          retainedIds.add(concept.id);

          await structureTx.condominiumStructurePosition.update({
            where: { id: concept.id },
            data: {
              name: concept.name,
              quantity: concept.quantity,
              isAlternate: concept.isAlternate,
              sortOrder: concept.sortOrder,
            },
          });

          continue;
        }

        await structureTx.condominiumStructurePosition.create({
          data: {
            condominiumId: condominium.id,
            groupId: targetGroup.id,
            name: concept.name,
            quantity: concept.quantity,
            isAlternate: concept.isAlternate,
            sortOrder: concept.sortOrder,
            isActive: true,
          },
        });
      }

      const idsToDeactivate = [...existingIds].filter((id) => !retainedIds.has(id));

      if (idsToDeactivate.length > 0) {
        await structureTx.condominiumStructurePosition.updateMany({
          where: {
            id: { in: idsToDeactivate },
          },
          data: {
            isActive: false,
          },
        });
      }

      return targetGroup;
    });

    return {
      ok: true,
      message: requestedId
        ? "La estructura condominal se actualizo correctamente."
        : "El grupo de estructura condominal se creo correctamente.",
      groupId: saved.id,
    };
  }

  async deleteGroup(id: string): Promise<CondominiumStructureCommandResult> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return {
        ok: false,
        message: "No hay un condominio activo para eliminar el grupo.",
      };
    }

    const groupId = trimSafe(id);
    if (!groupId) {
      return {
        ok: false,
        message: "El grupo solicitado no es valido.",
      };
    }

    const structurePrisma = prisma as unknown as StructurePrismaAccess;

    const group = await structurePrisma.condominiumStructureGroup.findFirst({
      where: {
        id: groupId,
        condominiumId: condominium.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!group) {
      return {
        ok: false,
        message: "El grupo ya no existe o no pertenece al condominio activo.",
      };
    }

    const activeConceptCount = await structurePrisma.condominiumStructurePosition.count({
      where: {
        condominiumId: condominium.id,
        groupId,
        isActive: true,
      },
    });

    if (activeConceptCount > 0) {
      return {
        ok: false,
        message: "No se puede eliminar un grupo que tiene conceptos activos.",
      };
    }

    await structurePrisma.condominiumStructureGroup.update({
      where: {
        id: groupId,
      },
      data: {
        isActive: false,
      },
    });

    return {
      ok: true,
      message: "El grupo se elimino correctamente.",
    };
  }
}
