import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  CondominiumOrganigramCommandResult,
  CondominiumOrganigramSnapshot,
  OrganigramPositionAssignee,
  SaveCondominiumOrganigramInput,
} from "../domain/condominium-organigram";
import type { CondominiumOrganigramRepository } from "../domain/condominium-organigram.repository";
import { resolveCondominiumContext, trimSafe } from "@/modules/condominium-structure/infrastructure/prisma-condominium-structure.shared";

type OrganigramAssignmentRecord = {
  id: string;
  userId: string;
  isAlternate: boolean;
  isActive: boolean;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
  };
};

type OrganigramPositionRecord = {
  id: string;
  name: string;
  quantity: number;
  isAlternate: boolean;
  assignments: OrganigramAssignmentRecord[];
};

type OrganigramGroupRecord = {
  id: string;
  name: string;
  position: number;
  positions: OrganigramPositionRecord[];
};

type OrganigramUserRecord = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
};

type PositionScopeRecord = {
  id: string;
  quantity: number;
  isAlternate: boolean;
};

type ExistingAssignmentRecord = {
  id: string;
  userId: string;
  isActive: boolean;
};

type OrganigramPrismaAccess = {
  condominiumStructureGroup: {
    findMany: (args: unknown) => Promise<OrganigramGroupRecord[]>;
  };
  user: {
    findMany: (args: unknown) => Promise<any[]>;
  };
  condominiumStructurePosition: {
    findMany: (args: unknown) => Promise<any[]>;
  };
  condominiumStructurePositionAssignment: {
    findMany: (args: unknown) => Promise<ExistingAssignmentRecord[]>;
    updateMany: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
};

function toDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
}): string {
  const businessName = user.businessName?.trim();
  if (businessName) {
    return businessName;
  }

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (fullName) {
    return fullName;
  }

  return "Sin nombre";
}

function normalizeSelectedIds(input: string[], maxAssignments: number, allowedUserIds: Set<string>): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const rawId of input) {
    const userId = trimSafe(rawId);
    if (!userId || seen.has(userId) || !allowedUserIds.has(userId)) {
      continue;
    }

    selected.push(userId);
    seen.add(userId);

    if (maxAssignments >= 0 && selected.length >= maxAssignments) {
      break;
    }
  }

  return selected;
}

export class PrismaCondominiumOrganigramRepository implements CondominiumOrganigramRepository {
  async getSnapshot(): Promise<CondominiumOrganigramSnapshot | null> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return null;
    }

    const organigramPrisma = prisma as unknown as OrganigramPrismaAccess;

    const [groups, users] = await Promise.all([
      organigramPrisma.condominiumStructureGroup.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          positions: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              assignments: {
                where: { isActive: true },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      organigramPrisma.user.findMany({
        where: {
          condominiumId: condominium.id,
          isActive: true,
        },
        orderBy: [{ businessName: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          businessName: true,
        },
      }),
    ]);

    return {
      condominiumId: condominium.id,
      condominiumName: condominium.name,
      userOptions: users.map((user) => ({
        id: user.id,
        displayName: toDisplayName(user),
      })),
      groups: groups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        groupPosition: group.position,
        rows: group.positions.map((position) => {
          const responsible: OrganigramPositionAssignee[] = [];
          const alternates: OrganigramPositionAssignee[] = [];

          for (const assignment of position.assignments) {
            const item = {
              userId: assignment.userId,
              displayName: toDisplayName(assignment.user),
            };

            if (assignment.isAlternate) {
              alternates.push(item);
            } else {
              responsible.push(item);
            }
          }

          responsible.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
          alternates.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));

          return {
            positionId: position.id,
            positionName: position.name,
            maxAssignments: Math.max(0, position.quantity),
            allowsAlternate: position.isAlternate,
            responsible,
            alternates,
          };
        }),
      })),
    };
  }

  async save(input: SaveCondominiumOrganigramInput): Promise<CondominiumOrganigramCommandResult> {
    const condominium = await resolveCondominiumContext();
    if (!condominium) {
      return {
        ok: false,
        message: "No hay un condominio activo para guardar la estructura.",
      };
    }

    const positionRows = input.positions.filter((row) => trimSafe(row.positionId).length > 0);
    if (positionRows.length === 0) {
      return {
        ok: false,
        message: "No se recibieron puestos para actualizar.",
      };
    }

    const allRequestedUserIds = [
      ...new Set(
        positionRows.flatMap((row) => [...row.responsibleUserIds, ...row.alternateUserIds].map((id) => trimSafe(id))),
      ),
    ].filter((id) => id.length > 0);

    const organigramPrisma = prisma as unknown as OrganigramPrismaAccess;

    const [positions, users] = await Promise.all([
      organigramPrisma.condominiumStructurePosition.findMany({
        where: {
          id: { in: positionRows.map((row) => row.positionId) },
          condominiumId: condominium.id,
          isActive: true,
          group: {
            isActive: true,
            condominiumId: condominium.id,
          },
        },
        select: {
          id: true,
          quantity: true,
          isAlternate: true,
        },
      }),
      organigramPrisma.user.findMany({
        where: {
          id: { in: allRequestedUserIds },
          condominiumId: condominium.id,
          isActive: true,
        },
        select: { id: true },
      }),
    ]);

    const positionById = new Map<string, PositionScopeRecord>(
      (positions as PositionScopeRecord[]).map((position) => [position.id, position]),
    );
    const allowedUserIds = new Set((users as Array<{ id: string }>).map((user) => user.id));

    await prisma.$transaction(async (tx) => {
      const organigramTx = tx as unknown as OrganigramPrismaAccess;

      for (const row of positionRows) {
        const position = positionById.get(row.positionId);
        if (!position) {
          continue;
        }

        const maxAssignments = Math.max(0, position.quantity);
        const selectedResponsibles = normalizeSelectedIds(row.responsibleUserIds, maxAssignments, allowedUserIds);
        const selectedAlternates = position.isAlternate
          ? normalizeSelectedIds(row.alternateUserIds, maxAssignments, allowedUserIds)
          : [];

        await this.syncAssignments(organigramTx, condominium.id, position.id, false, selectedResponsibles);
        await this.syncAssignments(organigramTx, condominium.id, position.id, true, selectedAlternates);
      }
    });

    return {
      ok: true,
      message: "La estructura condominal se actualizo correctamente.",
    };
  }

  private async syncAssignments(
    tx: OrganigramPrismaAccess,
    condominiumId: string,
    positionId: string,
    isAlternate: boolean,
    selectedUserIds: string[],
  ): Promise<void> {
    const existing = await tx.condominiumStructurePositionAssignment.findMany({
      where: {
        condominiumId,
        positionId,
        isAlternate,
      },
      select: {
        id: true,
        userId: true,
        isActive: true,
      },
    });

    const selectedSet = new Set(selectedUserIds);
    const byUserId = new Map<string, ExistingAssignmentRecord>(
      existing.map((assignment) => [assignment.userId, assignment]),
    );

    const idsToDisable = existing
      .filter((assignment) => assignment.isActive && !selectedSet.has(assignment.userId))
      .map((assignment) => assignment.id);

    if (idsToDisable.length > 0) {
      await tx.condominiumStructurePositionAssignment.updateMany({
        where: {
          id: { in: idsToDisable },
        },
        data: {
          isActive: false,
        },
      });
    }

    for (const userId of selectedUserIds) {
      const current = byUserId.get(userId);

      if (!current) {
        await tx.condominiumStructurePositionAssignment.create({
          data: {
            condominiumId,
            positionId,
            userId,
            isAlternate,
            isActive: true,
          },
        });
        continue;
      }

      if (!current.isActive) {
        await tx.condominiumStructurePositionAssignment.update({
          where: { id: current.id },
          data: { isActive: true },
        });
      }
    }
  }
}
