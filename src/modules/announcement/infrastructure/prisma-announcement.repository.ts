import { prisma } from "@/shared/infrastructure/db/prisma";
import { Announcement } from "../domain/announcement.types";

export class PrismaAnnouncementRepository {
  async findAll(): Promise<Announcement[]> {
    const records = await prisma.announcement.findMany({
      where: { 
        isActive: true,
        deletedAt: null
      },
      include: {
        type: true,
        subtype: true,
        status: true,
        dates: {
          where: { isActive: true },
          orderBy: { date: "asc" }
        },
        topics: {
          where: { isActive: true },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return records.map(r => ({
      ...r,
      attendancePercentage: Number(r.attendancePercentage),
      dates: r.dates.map(d => ({
        ...d,
        date: d.date
      })),
      topics: r.topics.map(t => ({
        ...t
      }))
    }));
  }

  async findById(id: string): Promise<Announcement | null> {
    const r = await prisma.announcement.findUnique({
      where: { id },
      include: {
        type: true,
        subtype: true,
        status: true,
        dates: {
          where: { isActive: true },
          orderBy: { date: "asc" }
        },
        topics: {
          where: { isActive: true },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!r) return null;

    return {
      ...r,
      attendancePercentage: Number(r.attendancePercentage),
      dates: r.dates.map(d => ({
        ...d,
        date: d.date
      })),
      topics: r.topics.map(t => ({
        ...t
      }))
    };
  }
}

export const announcementRepository = new PrismaAnnouncementRepository();
