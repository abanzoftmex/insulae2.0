import type { UseCase } from "@/shared/application/use-case";

import type { NotificationFormData } from "../domain/notification";
import type { NotificationRepository } from "../domain/notification.repository";

export class GetNotificationFormUseCase implements UseCase<string | undefined, NotificationFormData | null> {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(notificationId?: string): Promise<NotificationFormData | null> {
    return this.repository.getFormData(notificationId);
  }
}
