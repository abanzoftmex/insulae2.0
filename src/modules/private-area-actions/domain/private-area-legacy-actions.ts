export type PrivateAreaHierarchyRole = "FUSION" | "PARENT" | "CHILD" | "SINGLE";

export type PrivateAreaLegacyActionId =
  | "EDIT_BASE"
  | "EDIT_IMAGES"
  | "OWNER_PAYMENTS"
  | "COMMERCE_PAYMENTS"
  | "RENTALS";

export type PrivateAreaLegacyActionKind = "icon" | "pill";

export interface PrivateAreaLegacyActionContext {
  privateAreaId: string;
  isActive: boolean;
  hierarchyRole: PrivateAreaHierarchyRole;
}

export interface PrivateAreaLegacyAction {
  id: PrivateAreaLegacyActionId;
  label: string;
  kind: PrivateAreaLegacyActionKind;
  href: string | null;
  isEnabled: boolean;
}

export type PrivateAreaLegacyActionsByPrivateAreaId = Record<
  string,
  PrivateAreaLegacyAction[]
>;