import type { PrivateAreaStatus } from "@/shared/domain/private-area-status";

export type PrivateAreaPaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "CARD"
  | "CHECK"
  | "OTHER";

export type PrivateAreaRoleBucket = "ACTUAL" | "LEGAL" | "INITIAL";

export interface PrivateAreaCatalogOption {
  id: string;
  name: string;
  initials: string | null;
}

export interface PrivateAreaUserOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface PrivateAreaAssignmentLine {
  id: string;
  roleName: string | null;
  roleBucket: PrivateAreaRoleBucket;
  startsAt: Date | null;
  endsAt: Date | null;
  user: PrivateAreaUserOption;
}

export interface PrivateAreaChargeLine {
  id: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  dueDate: Date | null;
  status: string;
  chargeGroupName: string;
  chargeGroupType: string | null;
  paidAmount: number;
  balanceAmount: number;
}

export interface PrivateAreaPaymentMovement {
  paymentId: string;
  paidAt: Date;
  method: PrivateAreaPaymentMethod;
  reference: string | null;
  notes: string | null;
  allocatedAmount: number;
  paymentTotalAmount: number;
}

export interface PrivateAreaRentalLine {
  id: string;
  tenantName: string | null;
  status: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  notes: string | null;
}

export interface PrivateAreaGeneralMetrics {
  areaM2: number;
  indivisoPercent: number;
  differenceFromOriginalM2: number | null;
}

export interface PrivateAreaActionPageData {
  privateAreaId: string;
  name: string;
  code: string | null;
  zone: string | null;
  useType: string | null;
  businessStatus: PrivateAreaStatus;
  businessStatusLabel: string;
  parentName: string | null;
  isActive: boolean;
  condominiumName: string;
  m2Apole: number | null;
  m2Original: number | null;
  m2Construction: number | null;
  m2CommonArea: number | null;
  m2ConstructionChildren: number | null;
  m2CommonAreaChildren: number | null;
  indiviso: number | null;
  vccc: number | null;
  isFusion: boolean;
  isChild: boolean;
  hasChildren: boolean;
  projectHasVccc: boolean;
  generalMetrics: PrivateAreaGeneralMetrics;
  zones: PrivateAreaCatalogOption[];
  landUses: PrivateAreaCatalogOption[];
  userOptions: PrivateAreaUserOption[];
  tenantOptions: string[];
  currentTenantName: string | null;
  assignments: PrivateAreaAssignmentLine[];
  annualOrdinaryFee: number | null;
  charges: PrivateAreaChargeLine[];
  payments: PrivateAreaPaymentMovement[];
  rentals: PrivateAreaRentalLine[];
}
