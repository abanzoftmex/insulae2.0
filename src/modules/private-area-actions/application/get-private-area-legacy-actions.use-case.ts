import type { UseCase } from "@/shared/application/use-case";

import type {
  PrivateAreaLegacyActionContext,
  PrivateAreaLegacyActionsByPrivateAreaId,
} from "../domain/private-area-legacy-actions";
import type { PrivateAreaLegacyActionsResolver } from "../domain/private-area-legacy-actions.resolver";

export class GetPrivateAreaLegacyActionsUseCase
  implements
    UseCase<
      PrivateAreaLegacyActionContext[],
      PrivateAreaLegacyActionsByPrivateAreaId
    >
{
  constructor(private readonly resolver: PrivateAreaLegacyActionsResolver) {}

  async execute(
    contexts: PrivateAreaLegacyActionContext[],
  ): Promise<PrivateAreaLegacyActionsByPrivateAreaId> {
    const actionsByPrivateAreaId: PrivateAreaLegacyActionsByPrivateAreaId = {};

    for (const context of contexts) {
      actionsByPrivateAreaId[context.privateAreaId] =
        await this.resolver.resolveForArea(context);
    }

    return actionsByPrivateAreaId;
  }
}