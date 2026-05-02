import { prisma } from "@/shared/infrastructure/db/prisma";

export class GetAnnouncementFormDataUseCase {
  async execute() {
    const [types, subtypes, users, structure] = await Promise.all([
      prisma.announcementType.findMany({ where: { isActive: true } }),
      prisma.announcementSubtype.findMany({ where: { isActive: true } }),
      prisma.user.findMany({ 
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true }
      }),
      prisma.condominiumStructureGroup.findMany({
        where: { isActive: true },
        include: {
          positions: {
            where: { isActive: true },
            select: { id: true, name: true }
          }
        },
        orderBy: { position: "asc" }
      })
    ]);

    return {
      types,
      subtypes,
      directory: users.map(u => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim()
      })),
      departments: structure.map(s => ({
        id: s.id,
        name: s.name,
        positions: s.positions.map(p => ({
          id: p.id,
          name: p.name
        }))
      }))
    };
  }
}

export const getAnnouncementFormDataUseCase = new GetAnnouncementFormDataUseCase();
