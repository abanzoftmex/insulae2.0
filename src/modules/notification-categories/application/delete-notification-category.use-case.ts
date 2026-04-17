import type { UseCase } from "@/shared/application/use-case";

import type { NotificationCategoryCommandResult } from "../domain/notification-category";
import type { NotificationCategoryRepository } from "../domain/notification-category.repository";

export class DeleteNotificationCategoryUseCase implements UseCase<string, NotificationCategoryCommandResult> {
  constructor(private readonly repository: NotificationCategoryRepository) {}

  async execute(id: string): Promise<NotificationCategoryCommandResult> {
    return this.repository.delete(id);
  }
}
