/**
 * Categoría de un comunicado, legible. La migración dejó en `category` el código del público de
 * la 1.0 ("1" propietarios, "2" comercios, "3" ambos); cualquier otro texto se muestra tal cual.
 */
const PUBLICO: Record<string, string> = {
  "1": "Propietarios",
  "2": "Comercios",
  "3": "Propietarios y Comercios",
};

export function categoriaComunicado(categoria: string | null | undefined): string {
  const c = (categoria ?? "").trim();
  return PUBLICO[c] ?? (c || "General");
}
