import type { UseCase } from "@/shared/application/use-case";

import type { NotificationCategoryFormSnapshot } from "../domain/notification-category";
import type { NotificationCategoryRepository } from "../domain/notification-category.repository";

export class GetNotificationCategoryFormUseCase implements UseCase<string, NotificationCategoryFormSnapshot | null> {
  constructor(private readonly repository: NotificationCategoryRepository) {}

  async execute(id: string): Promise<NotificationCategoryFormSnapshot | null> {
    return this.repository.getById(id);
  }
}
