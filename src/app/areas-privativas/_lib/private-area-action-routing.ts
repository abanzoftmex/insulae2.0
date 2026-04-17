type SearchParamValue = string | string[] | undefined;

export type ActionPageSearchParams = Record<string, SearchParamValue>;

export interface ResolvedPrivateAreaReference {
  privateAreaId: string;
}

const UUID_V4_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isUuidLike(value: string): boolean {
  return UUID_V4_LIKE_REGEX.test(value.trim());
}

export function resolvePrivateAreaReference(
  searchParams: ActionPageSearchParams,
): ResolvedPrivateAreaReference | null {
  const raw = pickParam(searchParams.id);

  const candidate = raw?.trim();
  if (!candidate) {
    return null;
  }

  if (!isUuidLike(candidate)) {
    return null;
  }

  return {
    privateAreaId: candidate,
  };
}

export function parseOpc(searchParams: ActionPageSearchParams): "1" | "2" {
  const raw = pickParam(searchParams.opc);
  if (raw === "1" || raw === "2") {
    return raw;
  }

  return "2";
}

export function buildActionHref(
  pathname:
    | "formulario-apol"
    | "formulario-apol-imagenes"
    | "listado-pagos"
    | "listado-arrendamientos",
  privateAreaId: string,
  opc?: "1" | "2",
): string {
  const params = new URLSearchParams({ id: privateAreaId });

  if (opc) {
    params.set("opc", opc);
  }

  return `/areas-privativas/${pathname}?${params.toString()}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null, fractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(value: Date | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

export function statusLabel(isActive: boolean): string {
  return isActive ? "Activo" : "Inactivo";
}
