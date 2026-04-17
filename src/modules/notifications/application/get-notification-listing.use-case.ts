import type { UseCase } from "@/shared/application/use-case";

import type { NotificationListing } from "../domain/notification";
import type { NotificationRepository } from "../domain/notification.repository";

export class GetNotificationListingUseCase implements UseCase<void, NotificationListing | null> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(): Promise<NotificationListing | null> {
    return this.repository.getListing();
  }
}
