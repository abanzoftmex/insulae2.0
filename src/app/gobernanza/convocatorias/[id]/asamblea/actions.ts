"use server";

import { prisma } from "@/shared/infrastructure/db/prisma";
import { revalidatePath } from "next/cache";

/**
 * Toggle attendance for a given position ID in the specific date called session.
 * Stores a comma-separated list of present position IDs.
 */
export async function toggleAttendanceAction(dateId: string, positionId: string, isPresent: boolean) {
  try {
    const callDate = await prisma.announcementDate.findUnique({
      where: { id: dateId }
    });

    if (!callDate) throw new Error("Called date not found");

    let current = callDate.checkedPositions
      ? callDate.checkedPositions.split(",").map(id => id.trim()).filter(Boolean)
      : [];

    if (isPresent) {
      if (!current.includes(positionId)) {
        current.push(positionId);
      }
    } else {
      current = current.filter(id => id !== positionId);
    }

    const updated = await prisma.announcementDate.update({
      where: { id: dateId },
      data: {
        checkedPositions: current.join(",")
      }
    });

    revalidatePath(`/gobernanza/convocatorias/${callDate.announcementId}`, "layout");
    return { success: true, checkedPositions: updated.checkedPositions };
  } catch (error: any) {
    console.error("Error toggling attendance:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cast or update a vote on a specific agenda topic for a given position.
 * Stores the vote mappings as a serialized JSON string in the database.
 */
export async function registerVoteAction(topicId: string, positionId: string, voteType: string) {
  try {
    const topic = await prisma.announcementTopic.findUnique({
      where: { id: topicId }
    });

    if (!topic) throw new Error("Topic not found");

    let currentVotes: Record<string, string> = {};
    if (topic.votesJson) {
      try {
        currentVotes = JSON.parse(topic.votesJson);
      } catch (err) {
        currentVotes = {};
      }
    }

    if (voteType === "NONE") {
      delete currentVotes[positionId];
    } else {
      currentVotes[positionId] = voteType; // FAVOR, AGAINST, ABSTAIN
    }

    const updated = await prisma.announcementTopic.update({
      where: { id: topicId },
      data: {
        votesJson: JSON.stringify(currentVotes)
      }
    });

    revalidatePath(`/gobernanza/convocatorias/${updated.announcementId}`, "layout");
    return { success: true, votesJson: updated.votesJson };
  } catch (error: any) {
    console.error("Error registering vote:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Save topic text conclusions/comments.
 */
export async function saveTopicConclusionsAction(topicId: string, conclusions: string) {
  try {
    const updated = await prisma.announcementTopic.update({
      where: { id: topicId },
      data: { conclusions }
    });

    revalidatePath(`/gobernanza/convocatorias/${updated.announcementId}`, "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving topic conclusions:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Close/complete the assembly session and update its status.
 */
export async function closeAsambleaAction(dateId: string, isCompleted: boolean) {
  try {
    const status = isCompleted ? "Realizada" : "No Realizada";
    
    const updatedDate = await prisma.announcementDate.update({
      where: { id: dateId },
      data: { status }
    });

    // Also update overall parent Announcement status to "Realizada" / "Concluida"
    const callDate = await prisma.announcementDate.findUnique({
      where: { id: dateId },
      include: { announcement: true }
    });

    if (callDate) {
      const closedStatus = await prisma.announcementStatus.findFirst({
        where: { name: { contains: isCompleted ? "Terminada" : "Cancelada" } }
      });
      
      if (closedStatus) {
        await prisma.announcement.update({
          where: { id: callDate.announcementId },
          data: { statusId: closedStatus.id }
        });
      }
      
      revalidatePath(`/gobernanza/convocatorias/${callDate.announcementId}`, "layout");
    }

    revalidatePath("/gobernanza/convocatorias");
    return { success: true, status };
  } catch (error: any) {
    console.error("Error closing assembly:", error);
    return { success: false, error: error.message };
  }
}
