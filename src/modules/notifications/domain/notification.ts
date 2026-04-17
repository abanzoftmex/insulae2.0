export type NotificationAudienceTypeId = "1" | "2" | "3";

export interface NotificationTypeOption {
  id: NotificationAudienceTypeId;
  label: string;
}

export interface NotificationCategoryOption {
  id: string;
  legacyId?: number | null;
  name: string;
  color: string | null;
}

export interface NotificationListItem {
  id: string;
  title: string;
  message: string;
  sentAt: Date | null;
  validUntil: Date | null;
  audienceTypeId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  pdfUrl: string | null;
}

export interface NotificationListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  rows: NotificationListItem[];
}

export interface NotificationFormSnapshot {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  validUntil: string;
  audienceTypeId: string;
  categoryId: string;
  imageUrl: string;
  imagePath: string;
  pdfUrl: string;
  pdfPath: string;
}

export interface NotificationFormData {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  typeOptions: NotificationTypeOption[];
  categoryOptions: NotificationCategoryOption[];
  snapshot: NotificationFormSnapshot | null;
}

export interface SaveNotificationInput {
  id?: string;
  title: string;
  message: string;
  sentAt?: string;
  validUntil?: string;
  audienceTypeId?: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  pdfUrl?: string | null;
  pdfPath?: string | null;
}

export interface NotificationCommandResult {
  ok: boolean;
  message: string;
  notificationId?: string;
}
