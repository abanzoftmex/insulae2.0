"use server";

import { prisma } from "@/shared/infrastructure/db/prisma";
import { revalidatePath } from "next/cache";

export async function createAnnouncementAction(formData: any) {
  try {
    // 1. Get Condominium
    const condominium = await prisma.condominium.findFirst({
      where: { slug: "valquirico" }
    });

    if (!condominium) throw new Error("Condominium not found");

    // 2. Get Default Status
    const status = await prisma.announcementStatus.findFirst({
      where: { name: { contains: "Pendiente" } }
    });

    // 3. Create Announcement
    const announcement = await prisma.announcement.create({
      data: {
        condominiumId: condominium.id,
        name: formData.name,
        typeId: formData.typeId,
        subtypeId: formData.subtypeId,
        statusId: status?.id || "",
        comments: formData.comments,
        pdfUrl: formData.pdfUrl,
        conveningPersonId: formData.conveningPersonId,
        conveningPosition: formData.conveningPosition,
        moderatorPersonId: formData.moderatorPersonId,
        moderatorPosition: formData.moderatorPosition,
        
        // Create Dates
        dates: {
          create: formData.dates
            .filter((d: any) => d.date && d.time)
            .map((d: any) => ({
              date: new Date(d.date),
              time: d.time,
              location: d.location,
              callType: d.callType,
            }))
        },

        // Create Agenda Topics
        topics: {
          create: formData.agendaTopics
            .filter((t: any) => t.title)
            .map((t: any, idx: number) => ({
              title: t.title,
              presenterId: t.presenterId,
              durationMinutes: t.durationMinutes,
              actionType: t.actionType,
              order: idx,
            }))
        },

        // Create Invited Positions (from Organigram)
        invitedPositions: {
          create: formData.topicIds.map((posId: string) => ({
            positionId: posId
          }))
        },

        // Create Special Guests
        specialGuests: {
          create: formData.specialGuests
            .filter((g: any) => g.name)
            .map((g: any) => ({
              name: g.name,
              email: g.email
            }))
        }
      }
    });

    revalidatePath("/gobernanza/convocatorias");
    return { success: true, id: announcement.id };
  } catch (error: any) {
    console.error("Error creating announcement:", error);
    return { success: false, error: error.message };
  }
}
