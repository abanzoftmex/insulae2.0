import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { presignGetUrl } from "@/shared/infrastructure/storage/r2";
import { contentDisposition, fileNameFromStoredUrl, isServableStorageKey } from "@/shared/infrastructure/storage/storage-paths";

/** La URL prefirmada vive 1 h; el navegador reutiliza la redirección media hora. */
const PRESIGNED_TTL_SECONDS = 60 * 60;
const REDIRECT_CACHE_SECONDS = 30 * 60;

/**
 * Archivos guardados en Cloudflare R2 (bucket privado).
 *
 *   GET /api/archivos/<clave>                       -> 302 a una URL prefirmada de R2
 *   GET /api/archivos/<clave>?descargar=1&nombre=x  -> igual, forzando la descarga como "x"
 *
 * No exige sesión: las claves llevan un segmento aleatorio (o la marca de tiempo de
 * Firebase en los archivos migrados) y estas URLs se usan en correos y en el minisitio,
 * como los enlaces con token de Firebase. El bucket no se puede listar.
 * Se redirige en vez de servir el contenido para no topar con el límite de 4.5 MB de las
 * funciones de Vercel.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (!isServableStorageKey(key)) {
    return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
  }

  const search = request.nextUrl.searchParams;
  const download = search.has("descargar");
  const fileName = search.get("nombre")?.trim() || fileNameFromStoredUrl(key);

  try {
    const url = await presignGetUrl(key, {
      expiresInSeconds: PRESIGNED_TTL_SECONDS,
      contentDisposition: download ? contentDisposition("attachment", fileName) : undefined,
    });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": `private, max-age=${REDIRECT_CACHE_SECONDS}` },
    });
  } catch (error) {
    console.error("[archivos] GET:", error);
    return NextResponse.json({ message: "No se pudo obtener el archivo" }, { status: 500 });
  }
}
