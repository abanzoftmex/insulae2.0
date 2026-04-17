import type {
  NotificationCategoryCommandResult,
  NotificationCategoryFormSnapshot,
  NotificationCategoryListing,
  SaveNotificationCategoryInput,
} from "./notification-category";

export interface NotificationCategoryRepository {
  getListing(): Promise<NotificationCategoryListing | null>;
  getById(id: string): Promise<NotificationCategoryFormSnapshot | null>;
  save(input: SaveNotificationCategoryInput): Promise<NotificationCategoryCommandResult>;
  delete(id: string): Promise<NotificationCategoryCommandResult>;
}
