export const PRIVATE_AREA_STATUS = {
  UNASSIGNED: "UNASSIGNED",
  AVAILABLE: "AVAILABLE",
  SOLD: "SOLD",
  UNDER_CONSTRUCTION: "UNDER_CONSTRUCTION",
  RENTED: "RENTED",
  DELINQUENT: "DELINQUENT",
} as const;

export type PrivateAreaStatus =
  (typeof PRIVATE_AREA_STATUS)[keyof typeof PRIVATE_AREA_STATUS];

const LABEL_BY_STATUS: Record<PrivateAreaStatus, string> = {
  [PRIVATE_AREA_STATUS.UNASSIGNED]: "Sin estatus",
  [PRIVATE_AREA_STATUS.AVAILABLE]: "Disponible",
  [PRIVATE_AREA_STATUS.SOLD]: "Vendida",
  [PRIVATE_AREA_STATUS.UNDER_CONSTRUCTION]: "Construccion",
  [PRIVATE_AREA_STATUS.RENTED]: "Rentada",
  [PRIVATE_AREA_STATUS.DELINQUENT]: "Morosa",
};

const LEGACY_TO_CANONICAL_STATUS: Record<number, PrivateAreaStatus> = {
  1: PRIVATE_AREA_STATUS.AVAILABLE,
  2: PRIVATE_AREA_STATUS.SOLD,
  3: PRIVATE_AREA_STATUS.UNDER_CONSTRUCTION,
  4: PRIVATE_AREA_STATUS.RENTED,
  5: PRIVATE_AREA_STATUS.DELINQUENT,
};

function normalizeStatusToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function toPrivateAreaStatusFromLegacy(
  legacyStatusId: number | null | undefined,
): PrivateAreaStatus {
  if (legacyStatusId === null || legacyStatusId === undefined) {
    return PRIVATE_AREA_STATUS.UNASSIGNED;
  }

  return LEGACY_TO_CANONICAL_STATUS[legacyStatusId] ?? PRIVATE_AREA_STATUS.UNASSIGNED;
}

export function toPrivateAreaStatus(value: string | null | undefined): PrivateAreaStatus {
  if (!value) {
    return PRIVATE_AREA_STATUS.UNASSIGNED;
  }

  const normalized = normalizeStatusToken(value);

  switch (normalized) {
    case PRIVATE_AREA_STATUS.AVAILABLE:
      return PRIVATE_AREA_STATUS.AVAILABLE;
    case PRIVATE_AREA_STATUS.SOLD:
      return PRIVATE_AREA_STATUS.SOLD;
    case PRIVATE_AREA_STATUS.UNDER_CONSTRUCTION:
      return PRIVATE_AREA_STATUS.UNDER_CONSTRUCTION;
    case PRIVATE_AREA_STATUS.RENTED:
      return PRIVATE_AREA_STATUS.RENTED;
    case PRIVATE_AREA_STATUS.DELINQUENT:
      return PRIVATE_AREA_STATUS.DELINQUENT;
    case PRIVATE_AREA_STATUS.UNASSIGNED:
      return PRIVATE_AREA_STATUS.UNASSIGNED;
    default:
      return PRIVATE_AREA_STATUS.UNASSIGNED;
  }
}

export function toPrivateAreaStatusLabel(status: PrivateAreaStatus): string {
  return LABEL_BY_STATUS[status] ?? LABEL_BY_STATUS[PRIVATE_AREA_STATUS.UNASSIGNED];
}

export function isOperationalPrivateAreaStatus(status: PrivateAreaStatus): boolean {
  return (
    status === PRIVATE_AREA_STATUS.UNASSIGNED ||
    status === PRIVATE_AREA_STATUS.AVAILABLE ||
    status === PRIVATE_AREA_STATUS.SOLD ||
    status === PRIVATE_AREA_STATUS.RENTED
  );
}

export function isVisibleChildPrivateAreaStatus(status: PrivateAreaStatus): boolean {
  return (
    status === PRIVATE_AREA_STATUS.UNASSIGNED ||
    status === PRIVATE_AREA_STATUS.AVAILABLE ||
    status === PRIVATE_AREA_STATUS.RENTED
  );
}

export function isLandUseEligiblePrivateAreaStatus(status: PrivateAreaStatus): boolean {
  return status === PRIVATE_AREA_STATUS.AVAILABLE || status === PRIVATE_AREA_STATUS.RENTED;
}
