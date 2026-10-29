"use client";

/**
 * Subida y borrado de archivos del panel en Cloudflare R2, con la misma interfaz que tenía
 * el cliente de Firebase Storage: `uploadCondominiumAsset` devuelve la URL que se guarda en
 * la base (`/api/archivos/<clave>`) y la clave del objeto (`fullPath`).
 *
 * El archivo va directo del navegador a R2 con una URL prefirmada que firma el servidor
 * (`storage-actions.ts`) tras validar permisos, tipo y tamaño.
 */
import { createUploadTargetAction, deleteStoredAssetAction } from "./storage-actions";
import type { CondoAssetKind } from "./storage-paths";

export type { CondoAssetKind };

export async function uploadCondominiumAsset(input: {
  file: File;
  condominiumSlug: string;
  projectId: string;
  kind: CondoAssetKind;
}): Promise<{ url: string; fullPath: string }> {
  const result = await createUploadTargetAction({
    kind: input.kind,
    condominiumSlug: input.condominiumSlug,
    projectId: input.projectId,
    fileName: input.file.name,
    contentType: input.file.type,
    size: input.file.size,
  });
  if (!result.ok) {
    throw new Error(result.message);
  }

  const { uploadUrl, headers, key, url } = result.target;
  const response = await fetch(uploadUrl, { method: "PUT", body: input.file, headers });
  if (!response.ok) {
    throw new Error(`No se pudo subir el archivo (HTTP ${response.status}).`);
  }

  return { url, fullPath: key };
}

/**
 * Borra un archivo a partir de la URL guardada en la base. Ignora los errores (el archivo
 * puede no existir ya), como hacía la versión de Firebase.
 */
export async function deleteCondominiumAsset(fileUrl: string): Promise<void> {
  try {
    const result = await deleteStoredAssetAction(fileUrl);
    if (!result.ok) {
      console.warn("No se pudo borrar el archivo:", result.message);
    }
  } catch (err) {
    console.warn("No se pudo borrar el archivo:", err);
  }
}
