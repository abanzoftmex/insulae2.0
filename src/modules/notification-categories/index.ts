import { DeleteNotificationCategoryUseCase } from "./application/delete-notification-category.use-case";
import { GetNotificationCategoryFormUseCase } from "./application/get-notification-category-form.use-case";
import { GetNotificationCategoryListingUseCase } from "./application/get-notification-category-listing.use-case";
import { SaveNotificationCategoryUseCase } from "./application/save-notification-category.use-case";
import { PrismaNotificationCategoryRepository } from "./infrastructure/prisma-notification-category.repository";
export { toNotificationCategoryListingVM } from "./presentation/notification-category-listing.vm";

const repository = new PrismaNotificationCategoryRepository();

export const getNotificationCategoryListingUseCase = new GetNotificationCategoryListingUseCase(repository);
export const getNotificationCategoryFormUseCase = new GetNotificationCategoryFormUseCase(repository);
export const saveNotificationCategoryUseCase = new SaveNotificationCategoryUseCase(repository);
export const deleteNotificationCategoryUseCase = new DeleteNotificationCategoryUseCase(repository);
