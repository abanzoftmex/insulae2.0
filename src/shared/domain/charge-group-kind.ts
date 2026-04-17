export const CHARGE_GROUP_KIND = {
  ORDINARY: "ORDINARY",
  EXTRA_CONDO: "EXTRA_CONDO",
  EXTRA_COMMERCE: "EXTRA_COMMERCE",
  STC: "STC",
  SANCTION: "SANCTION",
  COMODATO: "COMODATO",
  OTHER: "OTHER",
} as const;

export type ChargeGroupKind =
  (typeof CHARGE_GROUP_KIND)[keyof typeof CHARGE_GROUP_KIND];

type ChargeGroupLike = {
  name: string | null | undefined;
  chargeType: string | null | undefined;
};

function tokenize(value: string): string[] {
  return value.split(/[^a-z0-9]+/).filter((token) => token.length > 0);
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

export function resolveChargeGroupKind(group: ChargeGroupLike): ChargeGroupKind {
  const name = normalizeToken(group.name);
  const chargeType = normalizeToken(group.chargeType);
  const nameTokens = tokenize(name);
  const hasToken = (token: string): boolean => nameTokens.includes(token);

  const looksExtra =
    chargeType.includes("extra") ||
    hasToken("extra") ||
    hasToken("extraordinaria") ||
    hasToken("extraordinarias");

  const looksCommerce =
    includesAny(name, ["comerc", "arrend", "renta", "local"]) ||
    hasToken("comercio") ||
    hasToken("comercios");

  // Evaluate "extra" first to avoid misclassifying "extraordinaria" as "ordinaria".
  if (looksExtra && looksCommerce) {
    return CHARGE_GROUP_KIND.EXTRA_COMMERCE;
  }

  if (looksExtra) {
    return CHARGE_GROUP_KIND.EXTRA_CONDO;
  }

  if (
    chargeType.includes("ordinary") ||
    hasToken("ordinaria") ||
    hasToken("ordinarias") ||
    hasToken("ordinary")
  ) {
    return CHARGE_GROUP_KIND.ORDINARY;
  }

  if (includesAny(name, ["comodato"])) {
    return CHARGE_GROUP_KIND.COMODATO;
  }

  if (
    chargeType.includes("sanction") ||
    includesAny(name, ["sancion", "mora", "morosidad", "penal"])
  ) {
    return CHARGE_GROUP_KIND.SANCTION;
  }

  if (chargeType.includes("stc") || includesAny(name, ["stc"])) {
    return CHARGE_GROUP_KIND.STC;
  }

  return CHARGE_GROUP_KIND.OTHER;
}
