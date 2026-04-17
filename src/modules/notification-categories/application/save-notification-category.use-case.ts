import type { UseCase } from "@/shared/application/use-case";

import type {
  NotificationCategoryCommandResult,
  SaveNotificationCategoryInput,
} from "../domain/notification-category";
import type { NotificationCategoryRepository } from "../domain/notification-category.repository";

export class SaveNotificationCategoryUseCase
  implements UseCase<SaveNotificationCategoryInput, NotificationCategoryCommandResult>
{
  constructor(private readonly repository: NotificationCategoryRepository) {}

  async execute(input: SaveNotificationCategoryInput): Promise<NotificationCategoryCommandResult> {
    return this.repository.save(input);
  }
}
