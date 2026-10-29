/**
 * Ejercicios que muestra el resumen financiero (lo comparten la carga inicial del servidor y
 * el "Reintentar" del cliente).
 *
 * Recorte a los 3 ejercicios más recientes: el panel publica un tríptico fijo ("Periodo
 * visual: 2024 / 2025 / 2026"), así que el minisitio muestra exactamente los mismos 3 años y
 * no más. Sin acordeón ni carga diferida.
 */
export function pickVisibleYears(dataAnios: { anios?: number[]; latest?: number } | null | undefined) {
  const anioActual = new Date().getFullYear();

  // Años con datos reales (o el actual si no hay).
  let disponibles = [anioActual];
  let latest = anioActual;
  if (dataAnios?.anios?.length) {
    disponibles = dataAnios.anios;
    latest = dataAnios.latest || disponibles[disponibles.length - 1];
  }

  const visibles = disponibles.slice(-3);
  const seleccionado = visibles.includes(latest) ? latest : visibles[visibles.length - 1];
  return { visibles, seleccionado };
}
