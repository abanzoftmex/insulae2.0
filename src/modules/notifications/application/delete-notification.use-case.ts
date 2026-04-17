import type { UseCase } from "@/shared/application/use-case";

import type { NotificationCommandResult } from "../domain/notification";
import type { NotificationRepository } from "../domain/notification.repository";

export class DeleteNotificationUseCase implements UseCase<string, NotificationCommandResult> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(notificationId: string): Promise<NotificationCommandResult> {
    return this.repository.delete(notificationId);
  }
}
