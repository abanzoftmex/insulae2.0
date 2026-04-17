import type {
  NotificationCommandResult,
  NotificationFormData,
  NotificationListing,
  SaveNotificationInput,
} from "./notification";

export interface NotificationRepository {
  getListing(): Promise<NotificationListing | null>;
  getFormData(notificationId?: string): Promise<NotificationFormData | null>;
  save(input: SaveNotificationInput): Promise<NotificationCommandResult>;
  delete(notificationId: string): Promise<NotificationCommandResult>;
}
