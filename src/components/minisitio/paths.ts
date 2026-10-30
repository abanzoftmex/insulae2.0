/**
 * Rutas del portal de condóminos. Todo el minisitio vive bajo `/minisitio`: usa `msPath()`
 * para construir cualquier enlace o redirección interna en vez de escribir rutas a mano.
 */
export const MINISITIO_BASE = "/minisitio";

export function msPath(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? MINISITIO_BASE : `${MINISITIO_BASE}${clean}`;
}

/** Quita el prefijo `/minisitio` (para comparar con las rutas del menú). */
export function stripMinisitioBase(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  if (pathname === MINISITIO_BASE) return "/";
  return pathname.startsWith(`${MINISITIO_BASE}/`) ? pathname.slice(MINISITIO_BASE.length) : pathname;
}
