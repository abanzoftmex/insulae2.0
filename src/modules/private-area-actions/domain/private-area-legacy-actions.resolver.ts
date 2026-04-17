import type {
  PrivateAreaLegacyAction,
  PrivateAreaLegacyActionContext,
} from "./private-area-legacy-actions";

export interface PrivateAreaLegacyActionsResolver {
  resolveForArea(
    context: PrivateAreaLegacyActionContext,
  ): Promise<PrivateAreaLegacyAction[]>;
}