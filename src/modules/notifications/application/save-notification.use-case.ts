import type { UseCase } from "@/shared/application/use-case";

import type { NotificationCommandResult, SaveNotificationInput } from "../domain/notification";
import type { NotificationRepository } from "../domain/notification.repository";

export class SaveNotificationUseCase
  implements UseCase<SaveNotificationInput, NotificationCommandResult>
{
  constructor(private readonly repository: NotificationRepository) {}

  async execute(input: SaveNotificationInput): Promise<NotificationCommandResult> {
    return this.repository.save(input);
  }
}
