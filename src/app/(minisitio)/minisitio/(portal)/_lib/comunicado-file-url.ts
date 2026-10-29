import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";

/** Host de los archivos de comunicados de la 1.0 (sus rutas guardadas empiezan con /imagenes/...). */
const LEGACY_NOTIFICATIONS_BASE = "https://sistemasabanza.com/insulae";

/**
 * Imagen o PDF de un comunicado: la URL guardada por insulae2.0 (`/api/archivos/...` o absoluta)
 * tal cual, o la ruta de la 1.0 bajo su host. Comprobar primero la URL de la app: también
 * empieza con "/", igual que las rutas legacy.
 */
export function comunicadoFileUrl(value: string): string {
  return isUsableFileUrl(value) ? value : `${LEGACY_NOTIFICATIONS_BASE}${value}`;
}
