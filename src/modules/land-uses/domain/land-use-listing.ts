export type LandUseApplicationMode = "ONE_TIME" | "PER_METER";

export interface LandUseChargeColumn {
  key: string;
  year: number;
  chargeGroupId: string;
  chargeGroupName: string;
  label: string;
}

export interface LandUseChargeValue {
  key: string;
  year: number;
  chargeGroupId: string;
  chargeGroupName: string;
  amount: number;
  applicationMode: LandUseApplicationMode;
}

export interface LandUseListItem {
  id: string;
  order: number | null;
  name: string;
  initials: string | null;
  totalAreas: number;
  totalM2: number;
  canDelete: boolean;
  charges: LandUseChargeValue[];
}

export interface LandUseListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  usesLandUseFormula: boolean;
  columns: LandUseChargeColumn[];
  rows: LandUseListItem[];
}
