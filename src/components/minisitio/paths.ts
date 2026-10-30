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

/** Id del panel de contenido del shell: en escritorio el scroll vive ahí, no en la ventana. */
export const CONTENT_ID = "ms-main";

/** Sube al inicio del contenido (el panel en escritorio, la ventana en el celular). */
export function scrollContentToTop(behavior: ScrollBehavior = "smooth"): void {
  if (typeof window === "undefined") return;
  document.getElementById(CONTENT_ID)?.scrollTo({ top: 0, behavior });
  window.scrollTo({ top: 0, behavior });
}

/** Quita el prefijo `/minisitio` (para comparar con las rutas del menú). */
export function stripMinisitioBase(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  if (pathname === MINISITIO_BASE) return "/";
  return pathname.startsWith(`${MINISITIO_BASE}/`) ? pathname.slice(MINISITIO_BASE.length) : pathname;
}
