import type {
  LandUseApplicationMode,
  LandUseChargeColumn,
  LandUseChargeValue,
} from "./land-use-listing";

export interface LandUseFormSnapshot {
  id: string;
  name: string;
  initials: string | null;
  order: number | null;
  weight: number | null;
  percentage: number | null;
  columns: LandUseChargeColumn[];
  charges: LandUseChargeValue[];
}

export interface LandUseFormTemplate {
  columns: LandUseChargeColumn[];
}

export interface SaveLandUseChargeInput {
  year: number;
  chargeGroupId: string;
  amount: number;
  applicationMode: LandUseApplicationMode;
}

export interface SaveLandUseInput {
  id?: string;
  name: string;
  initials?: string | null;
  order?: number | null;
  weight?: number | null;
  percentage?: number | null;
  charges: SaveLandUseChargeInput[];
}

export interface LandUseCommandResult {
  ok: boolean;
  message: string;
  landUseId?: string;
}
