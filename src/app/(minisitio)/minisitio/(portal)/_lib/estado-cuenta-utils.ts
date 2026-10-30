/**
 * Utilidades de los dos estados de cuenta del portal (propiedad y arrendamiento): formatos,
 * URLs heredadas del minisitio (logo del proyecto y documentos) y carga de imágenes para los
 * PDF. Solo para código de cliente: usa el DOM y llama a una server action.
 */
import { fetchImageAsDataUrlAction } from "@/app/(minisitio)/minisitio/_actions/account";
import { isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";

export { formatCurrency } from "./format";

/** Fecha ISO → d/m/aaaa (es-MX). Separa las partes para evitar el desfase de zona horaria. */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  const [year, month, day] = dateString.split("T")[0].split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString("es-MX");
}

/** `parseFloat(valor) || 0`, como hacía el minisitio con montos que podían llegar como texto. */
export function toAmount(value: unknown): number {
  return parseFloat(value as string) || 0;
}

/** Saldo de un movimiento: cargo - abono + intereses - descuento. */
export function movementBalance(movimiento: {
  monto: unknown;
  montoAbonado: unknown;
  intereses: unknown;
  descuento_aplicado: unknown;
}): number {
  return (
    toAmount(movimiento.monto) -
    toAmount(movimiento.montoAbonado) +
    toAmount(movimiento.intereses) -
    toAmount(movimiento.descuento_aplicado)
  );
}

/** `id_cat_status_pago` → status de StatusBadge: pagado (2) → "Al día", pendiente (1) → "Pendiente", otro → "Vencido". */
export function movementBadgeStatus(idCatStatusPago: number | null | undefined): number {
  return idCatStatusPago === 2 ? 1 : idCatStatusPago === 1 ? 2 : 3;
}

/** Artículo del reglamento de una sanción. La consulta todavía no lo trae (`sancionInfo` llega en null). */
export function sancionArticulo(movimiento: { sancionInfo?: unknown }): string | null {
  const info = movimiento.sancionInfo as { articulo?: string | null } | null | undefined;
  return info?.articulo || null;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nombre del archivo PDF: `estado-cuenta-<nombre normalizado>.pdf`. */
export function statementFileName(name: string): string {
  return `estado-cuenta-${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
}

const LEGACY_PROJECT_LOGO_BASE = "https://sistemasabanza.com/insulae/imagenes/proyectos/logo/";
const LEGACY_DOCUMENTS_BASE = "https://sistemasabanza.com/insulae/imagenes/documentos/";
/** Logo de los PDF cuando el proyecto no tiene uno (el mismo que usaba el minisitio). */
const DEFAULT_PDF_LOGO_URL = "https://encuesta.sistemasabanza.com/logo_dark.png";

/**
 * URL del logo del proyecto. insulae2.0 guarda la URL del archivo (`/api/archivos/...`); el
 * minisitio le anteponía la ruta legacy, que se conserva por si llega solo el nombre del archivo.
 */
export function projectLogoUrl(logo: string | null | undefined): string | null {
  if (!logo) return null;
  return isUsableFileUrl(logo) ? logo : `${LEGACY_PROJECT_LOGO_BASE}${logo}`;
}

/** URL de un documento/reglamento: completa en insulae2.0; ruta legacy si solo llega el archivo. */
export function documentUrl(archivo: string): string {
  return isUsableFileUrl(archivo) ? archivo : `${LEGACY_DOCUMENTS_BASE}${archivo}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Logo del proyecto como <img> para jsPDF. Se descarga en el servidor (antes /api/proxy-image)
 * y llega como data URL, sin problemas de CORS. Rechaza si no se pudo obtener: el PDF pinta
 * entonces el recuadro de respaldo, igual que el minisitio.
 */
export async function loadProjectLogoImage(logo: string | null | undefined): Promise<HTMLImageElement> {
  const dataUrl = await fetchImageAsDataUrlAction(projectLogoUrl(logo) ?? DEFAULT_PDF_LOGO_URL);
  if (!dataUrl) throw new Error("No se pudo descargar el logo del proyecto");
  return loadImage(dataUrl);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
