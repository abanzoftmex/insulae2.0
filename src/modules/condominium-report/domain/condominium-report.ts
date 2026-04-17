export type LandUseClassificationMode = "SASSI_LT" | "DEFAULT";

export interface LandUseZoneRow {
  landUseName: string;
  landUseInitials: string | null;
  total: number;
  byZone: Record<string, number>;
}

export interface CondominiumReport {
  condominiumId: string;
  condominiumName: string;
  condominiumSlug: string;
  projectId: string | null;
  projectName: string | null;
  projectTotalApoles: number;
  projectTotalM2: number;
  projectCommonAreasM2: number;
  totalRegisteredPrivateAreas: number;
  activePrivateAreas: number;
  inactivePrivateAreas: number;
  areasWithUseType: number;
  areasWithoutUseType: number;
  totalPrivateAreaM2: number;
  totalBuiltAreaM2: number;
  totalIndiviso: number;
  availableAreas: number;
  builtAreas: number;
  classificationBaseTotal: number;
  classificationBaseLabel: string;
  classifiedAreas: number;
  unclassifiedAreas: number;
  availableRatio: number;
  builtRatio: number;
  zoneNames: string[];
  landUseRows: LandUseZoneRow[];
  totalsByZone: Record<string, number>;
  grandTotal: number;
  classificationMode: LandUseClassificationMode;
  caveats: string[];
  lastUpdatedAt: Date;
  generatedAt: Date;
}
