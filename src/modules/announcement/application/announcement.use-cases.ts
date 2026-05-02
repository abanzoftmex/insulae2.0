import { announcementRepository } from "../infrastructure/prisma-announcement.repository";
import { Announcement } from "../domain/announcement.types";

export class GetAnnouncementsUseCase {
  async execute(): Promise<Announcement[]> {
    return await announcementRepository.findAll();
  }
}

export class GetAnnouncementByIdUseCase {
  async execute(id: string): Promise<Announcement | null> {
    return await announcementRepository.findById(id);
  }
}

export const getAnnouncementsUseCase = new GetAnnouncementsUseCase();
export const getAnnouncementByIdUseCase = new GetAnnouncementByIdUseCase();
