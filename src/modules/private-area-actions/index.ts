import { GetPrivateAreaLegacyActionsUseCase } from "./application/get-private-area-legacy-actions.use-case";
import { GetPrivateAreaActionPageDataUseCase } from "./application/get-private-area-action-page-data.use-case";
import { PrismaPrivateAreaActionPageDataRepository } from "./infrastructure/prisma-private-area-action-page-data.repository";
import { LegacyPrivateAreaActionsResolver } from "./infrastructure/legacy-private-area-actions.resolver";

const privateAreaLegacyActionsResolver = new LegacyPrivateAreaActionsResolver();
const privateAreaActionPageDataRepository =
  new PrismaPrivateAreaActionPageDataRepository();

export const getPrivateAreaLegacyActionsUseCase =
  new GetPrivateAreaLegacyActionsUseCase(privateAreaLegacyActionsResolver);

export const getPrivateAreaActionPageDataUseCase =
  new GetPrivateAreaActionPageDataUseCase(privateAreaActionPageDataRepository);

export type {
  PrivateAreaLegacyAction,
  PrivateAreaLegacyActionContext,
  PrivateAreaLegacyActionsByPrivateAreaId,
} from "./domain/private-area-legacy-actions";

export type { PrivateAreaActionPageData } from "./domain/private-area-action-page-data";

export type {
  GetPrivateAreaActionPageDataInput,
  PrivateAreaActionPageViewData,
} from "./application/get-private-area-action-page-data.use-case";