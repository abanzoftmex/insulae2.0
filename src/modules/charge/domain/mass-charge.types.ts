export type TargetType = "COMERCIO" | "PROPIETARIO";

export interface PreviewMassChargeRequest {
  condominiumId: string;
  zone: string;
  chargeGroupId: string;
  targetType: TargetType;
  months: number[];
  year: number;
  concept: string;
  startDay: number;
  dueDay: number;
}

export interface PreviewPropertyResult {
  privateAreaId: string;
  privateAreaName: string;
  hasCommerce: boolean;
  commerceName: string | null;
  willCharge: boolean;
  reason: string;
  amountPerMonth: number;
  totalAmount: number;
}

export interface PreviewMassChargeResult {
  zone: string;
  chargeGroupName: string;
  targetType: TargetType;
  months: number[];
  year: number;
  concept: string;
  properties: PreviewPropertyResult[];
  summary: {
    totalProperties: number;
    withCommerce: number;
    withoutCommerce: number;
    willChargeCount: number;
    skippedCount: number;
    totalAmountToCharge: number;
  };
}

export interface CreateMassChargeRequest {
  condominiumId: string;
  chargeGroupId: string;
  concept: string;
  months: number[];
  year: number;
  startDay: number;
  dueDay: number;
  selectedPrivateAreaIds: string[];
}

export interface CreateMassChargeResult {
  success: boolean;
  chargesCreated: number;
  error?: string;
}

export interface IChargeRepository {
  previewMassCharges(req: PreviewMassChargeRequest): Promise<PreviewMassChargeResult>;
  createMassCharges(req: CreateMassChargeRequest, previewCache: PreviewPropertyResult[]): Promise<CreateMassChargeResult>;
}
