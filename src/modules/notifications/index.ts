import { DeleteNotificationUseCase } from "./application/delete-notification.use-case";
import { GetNotificationFormUseCase } from "./application/get-notification-form.use-case";
import { GetNotificationListingUseCase } from "./application/get-notification-listing.use-case";
import { SaveNotificationUseCase } from "./application/save-notification.use-case";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";

export { toNotificationListingVM } from "./presentation/notification-listing.vm";

const repository = new PrismaNotificationRepository();

export const getNotificationListingUseCase = new GetNotificationListingUseCase(repository);
export const getNotificationFormUseCase = new GetNotificationFormUseCase(repository);
export const saveNotificationUseCase = new SaveNotificationUseCase(repository);
export const deleteNotificationUseCase = new DeleteNotificationUseCase(repository);
