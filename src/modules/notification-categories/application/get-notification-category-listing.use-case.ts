import type { UseCase } from "@/shared/application/use-case";

import type { NotificationCategoryListing } from "../domain/notification-category";
import type { NotificationCategoryRepository } from "../domain/notification-category.repository";

export class GetNotificationCategoryListingUseCase implements UseCase<void, NotificationCategoryListing | null> {
  constructor(private readonly repository: NotificationCategoryRepository) {}

  async execute(): Promise<NotificationCategoryListing | null> {
    return this.repository.getListing();
  }
}
