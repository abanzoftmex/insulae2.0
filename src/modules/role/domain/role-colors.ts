export interface RolePaletteColor {
  hex: string;
  name: string;
  description: string;
}

/**
 * Paleta curada de 18 colores de alto contraste conforme a WCAG AA (ratio >= 4.5:1 sobre fondo blanco).
 * Diseñada en armonía con la identidad de Insulae (#304854, blanco, negro, gama dorada/toscana #d0b685)
 * sin limitarse solo a azules y dorados, y evitando tonos pálidos o confusión con alertas rojas/verdes puras.
 */
export const ROLE_PALETTE: readonly RolePaletteColor[] = [
  { hex: "#304854", name: "Azul Insulae", description: "Identidad principal Insulae / Corporativo" },
  { hex: "#1d4ed8", name: "Azul Cobalto", description: "Azul primario profundo" },
  { hex: "#0369a1", name: "Azul Cerúleo", description: "Azul cielo oscuro" },
  { hex: "#0e7490", name: "Azul Petróleo", description: "Cian profundo equilibrado" },
  { hex: "#155e75", name: "Azul Egeo", description: "Azul mineral marino" },
  { hex: "#4338ca", name: "Índigo Profundo", description: "Índigo real distinguido" },
  { hex: "#6d28d9", name: "Violeta Real", description: "Violeta de alto contraste" },
  { hex: "#5b21b6", name: "Morado Obsidiana", description: "Púrpura noche sobrio" },
  { hex: "#7e22ce", name: "Púrpura Ciruela", description: "Púrpura rico y legible" },
  { hex: "#86198f", name: "Magenta Profundo", description: "Fucsia oscuro elegante" },
  { hex: "#be185d", name: "Rosa Vino", description: "Rosa frambuesa profundo" },
  { hex: "#881337", name: "Borgoña", description: "Vino tinto clásico" },
  { hex: "#9a3412", name: "Terracota", description: "Tierra cálida de Val'Quirico" },
  { hex: "#a14607", name: "Ámbar Tostado", description: "Ámbar oscuro de alto contraste" },
  { hex: "#825f12", name: "Dorado Ocre", description: "Dorado toscano Val'Quirico" },
  { hex: "#047857", name: "Verde Bosque", description: "Esmeralda oscuro institucional" },
  { hex: "#0f766e", name: "Verde Salvia", description: "Verde azulado mate" },
  { hex: "#374151", name: "Grafito", description: "Gris neutro profundo" },
] as const;

export const DEFAULT_ROLE_COLOR = "#304854";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeComparableRoleName(name: string | null | undefined): string {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Asignaciones predeterminadas canónicas por nombre de rol para garantizar
 * coherencia histórica sin alterar los permisos ni la lógica de negocio.
 */
export const CANONICAL_ROLE_DEFAULT_COLORS: Record<string, string> = {
  // Roles de panel / administrativos
  "master": "#304854",
  "asistente de direccion general": "#1d4ed8",
  "auxiliar administrativo ingresos-egresos": "#0e7490",
  "coordinador de contabilidad": "#155e75",
  "direccion insulae": "#4338ca",
  "estadistica": "#6d28d9",
  "mantenimiento y cominfra": "#0f766e",
  "operaciones valquirico": "#047857",
  "paramedicos": "#86198f",
  "recepcion de condominio": "#be185d",
  "administrador de subcondominio": "#0369a1",
  // Roles patrimoniales / residenciales
  "dominio pleno": "#825f12",
  "ficha de contacto": "#374151",
  "arrendatario": "#9a3412",
  "dueno legal": "#5b21b6",
  "dueño legal": "#5b21b6",
  "dueno moral": "#7e22ce",
  "dueño moral": "#7e22ce",
  // Minisitio
  "solo minisitio": "#a14607",
  "condomino": "#a14607",
  // SASSI-específicos
  "comseg": "#0e7490",
  "comercio": "#9a3412",
  "comision de actividad economica": "#825f12",
  "consejo de administracion y consejo de vigilancia": "#0369a1",
  "proveedor": "#374151",
  "web insulae": "#1d4ed8",
};

/**
 * Valida si un valor corresponde a un código hexadecimal válido (#RGB o #RRGGBB).
 */
export function isValidRoleHexColor(value: string | null | undefined): boolean {
  if (!value) return false;
  return HEX_COLOR_REGEX.test(value.trim());
}

/**
 * Normaliza cualquier formato hexadecimal válido a #rrggbb minúsculas.
 * Retorna null si no es un color hexadecimal válido.
 */
export function normalizeRoleHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) return null;

  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

/**
 * Lanza un error de validación claro si el color no es un hexadecimal válido.
 */
export function assertValidRoleHexColor(value: string | null | undefined): string {
  const normalized = normalizeRoleHexColor(value);
  if (!normalized) {
    throw new Error(
      `El color proporcionado «${value ?? ""}» no es un formato hexadecimal válido (ej. #304854 o #0e7490).`,
    );
  }
  return normalized;
}

/**
 * Determina un color de respaldo determinista basado en el hash del nombre del rol,
 * de modo que ningún rol se muestre jamás sin color o con estilo indefinido.
 */
export function fallbackColorForRoleName(name: string | null | undefined): string {
  const normalized = normalizeComparableRoleName(name);
  if (CANONICAL_ROLE_DEFAULT_COLORS[normalized]) {
    return CANONICAL_ROLE_DEFAULT_COLORS[normalized];
  }

  if (!normalized) return DEFAULT_ROLE_COLOR;

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ROLE_PALETTE.length;
  return ROLE_PALETTE[index].hex;
}

/**
 * Resuelve el color final de un rol aplicando la siguiente prioridad:
 * 1. Color personalizado explícito guardado en el rol (validado y normalizado).
 * 2. Asignación predeterminada canónica por nombre de rol.
 * 3. Color determinista generado por hash sobre la paleta de 18 colores.
 */
export function resolveRoleColor(role?: {
  name?: string | null;
  color?: string | null;
}): string {
  if (!role) return DEFAULT_ROLE_COLOR;

  const direct = normalizeRoleHexColor(role.color);
  if (direct) return direct;

  return fallbackColorForRoleName(role.name);
}

/**
 * Calcula la luminancia relativa según WCAG 2.1.
 */
function getRelativeLuminance(hex: string): number {
  const normalized = normalizeRoleHexColor(hex) ?? DEFAULT_ROLE_COLOR;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const transform = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Calcula el ratio de contraste entre dos colores hexadecimales (1..21).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const max = Math.max(lum1, lum2);
  const min = Math.min(lum1, lum2);
  return (max + 0.05) / (min + 0.05);
}

export interface RoleBadgeStyles {
  color: string;
  backgroundColor: string;
  borderColor: string;
  dotColor: string;
}

/**
 * Retorna los estilos CSS listos para usar en insignias o etiquetas de roles.
 * Asegura contraste óptimo: si el color ingresado por el usuario no cumple con WCAG AA (ratio >= 4.5:1
 * sobre fondo blanco o sobre su propio fondo de tintado), aplica automáticamente un texto sólido oscuro
 * o estilo accesible para garantizar legibilidad en pantallas claras tanto desktop como móvil.
 */
export function getRoleBadgeStyles(colorHex: string): RoleBadgeStyles {
  const normalized = normalizeRoleHexColor(colorHex) ?? DEFAULT_ROLE_COLOR;
  const contrastVsWhite = getContrastRatio(normalized, "#ffffff");

  // Si el contraste es suficiente (todos los colores de la paleta cumplen >= 5.36:1):
  if (contrastVsWhite >= 4.5) {
    return {
      color: normalized,
      backgroundColor: `${normalized}14`, // ~8% opacidad
      borderColor: `${normalized}38`,     // ~22% opacidad
      dotColor: normalized,
    };
  }

  // Fallback seguro para colores personalizados demasiado claros (ej. amarillos pasteles o cianes claros):
  return {
    color: "#0f172a",
    backgroundColor: `${normalized}33`,
    borderColor: `${normalized}80`,
    dotColor: normalized,
  };
}

/**
 * Sugiere el siguiente color de la paleta no utilizado en un conjunto de roles activos.
 */
export function pickSuggestedRoleColor(usedColors: Array<string | null | undefined>): string {
  const normalizedUsed = new Set(
    usedColors.map((c) => normalizeRoleHexColor(c)).filter(Boolean) as string[],
  );

  for (const item of ROLE_PALETTE) {
    if (!normalizedUsed.has(item.hex.toLowerCase())) {
      return item.hex;
    }
  }

  return ROLE_PALETTE[0].hex;
}

