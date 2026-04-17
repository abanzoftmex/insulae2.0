export interface NotificationCategoryListItem {
  id: string;
  name: string;
  color: string | null;
  notificationsCount: number;
  canDelete: boolean;
}

export interface NotificationCategoryListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  rows: NotificationCategoryListItem[];
}

export interface NotificationCategoryFormSnapshot {
  id: string;
  name: string;
  color: string | null;
}

export interface SaveNotificationCategoryInput {
  id?: string;
  name: string;
  color?: string | null;
}

export interface NotificationCategoryCommandResult {
  ok: boolean;
  message: string;
  categoryId?: string;
}
