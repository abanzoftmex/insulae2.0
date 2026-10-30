import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readVerifiedCondominoSession } from "@/shared/application/auth/condomino-session";
import { presignGetUrl } from "@/shared/infrastructure/storage/r2";
import { contentDisposition, fileNameFromStoredUrl, isServableStorageKey, storageKeyFromUrl } from "@/shared/infrastructure/storage/storage-paths";

/**
 * Descarga forzada de un archivo guardado por insulae2.0 (adjuntos de respuestas de tickets):
 * redirige a una URL prefirmada de R2 con `Content-Disposition: attachment` y el nombre pedido.
 * Acepta la URL guardada en la base (`/api/archivos/...`) o una URL antigua de Firebase, cuyo
 * objeto se copió a R2 con la misma clave. Antes era /api/tickets/download del minisitio (sin
 * sesión); ahora exige sesión.
 *
 *   GET /minisitio/archivos/descarga?url=<url guardada>&name=<nombre>
 */
export async function GET(request: NextRequest) {
  if (!(await readVerifiedCondominoSession())) {
    return NextResponse.json({ message: "Sesión no válida" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!url) return NextResponse.json({ message: "URL requerida" }, { status: 400 });

  const key = storageKeyFromUrl(url);
  if (!key || !isServableStorageKey(key)) {
    return NextResponse.json({ message: "URL no permitida" }, { status: 400 });
  }

  try {
    const signedUrl = await presignGetUrl(key, {
      expiresInSeconds: 300,
      contentDisposition: contentDisposition("attachment", name || fileNameFromStoredUrl(key) || "documento"),
    });
    return NextResponse.redirect(signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[minisitio] descarga:", error);
    return NextResponse.json({ message: "Error interno al descargar el archivo" }, { status: 500 });
  }
}
