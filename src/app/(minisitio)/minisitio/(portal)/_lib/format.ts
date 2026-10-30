/**
 * Formatos del portal (es-MX). Funciones puras: sirven igual en el servidor y en el navegador.
 */
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** Monto en pesos ("$1,234.50"). Lo que no es número sale como $0.00, como en el minisitio. */
export function formatCurrency(amount: unknown): string {
  const value = typeof amount === "number" ? amount : parseFloat(amount as string);
  return MXN.format(Number.isFinite(value) ? value : 0);
}

/** "2213499928" → "221 349 9928" (10 dígitos de México); lo demás se deja como viene. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : value.trim();
}

/** Enlace para llamar (`tel:+52…` con 10 dígitos de México), o null si no parece un teléfono. */
export function telHref(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+52${digits}`;
  return digits.length >= 7 ? `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}` : null;
}
