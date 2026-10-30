import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";

const DOCUMENTOS_LEGACY_BASE = "https://sistemasabanza.com/insulae/imagenes/documentos/";

/** insulae2.0 guarda la URL del archivo (`/api/archivos/...`); se conserva la ruta legacy si llega solo el nombre. */
export function documentoUrl(archivo: string) {
  return isUsableFileUrl(archivo) ? archivo : `${DOCUMENTOS_LEGACY_BASE}${archivo}`;
}
