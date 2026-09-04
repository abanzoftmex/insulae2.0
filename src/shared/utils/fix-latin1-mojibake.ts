/**
 * Repara texto con doble codificación (bytes UTF-8 leídos como latin1 / cp1252),
 * p. ej. "DueÃ±o Legal" -> "Dueño Legal", "DUEÃ‘O" -> "DUEÑO".
 *
 * MySQL "latin1" es en realidad cp1252, por lo que algunos bytes 0x80-0x9F aparecen
 * como caracteres tipográficos (‰ ‘ “ š …) y no como controles C1; ambos casos se cubren.
 *
 * Solo transforma cuando detecta el patrón; el texto ya correcto se devuelve intacto,
 * por lo que es seguro aplicarlo sobre cualquier valor que venga del legacy.
 */

// Caracteres cp1252 en 0x80-0x9F que difieren de ISO-8859-1 -> byte original.
const CP1252_TO_BYTE: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
  "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
  "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92,
  "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c,
  "ž": 0x9e, "Ÿ": 0x9f,
};

const CONTINUATION_CLASS = "[\\u0080-\\u00BF" + Object.keys(CP1252_TO_BYTE).join("") + "]";
// Byte líder UTF-8 de 2 bytes (Â o Ã) seguido de un byte de continuación mal decodificado.
const MOJIBAKE_PATTERN = new RegExp("[\\u00C2\\u00C3]" + CONTINUATION_CLASS);

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export function hasLatin1Mojibake(value: string): boolean {
  return MOJIBAKE_PATTERN.test(value);
}

export function fixLatin1Mojibake<T extends string | null | undefined>(value: T): T {
  if (typeof value !== "string" || !hasLatin1Mojibake(value)) return value;

  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const byte = code <= 0xff ? code : CP1252_TO_BYTE[value[i]];
    if (byte === undefined) return value; // hay caracteres que no vienen de una mala decodificación
    bytes[i] = byte;
  }

  try {
    return utf8Decoder.decode(bytes) as T;
  } catch {
    return value; // los bytes no forman UTF-8 válido: conservar el original
  }
}
