import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readCondominoSession } from "@/shared/application/auth/condomino-session";

/** Solo archivos de Firebase Storage (adjuntos de respuestas de tickets). */
const ALLOWED_PREFIXES = ["https://firebasestorage.googleapis.com/", "https://storage.googleapis.com/"];

/**
 * Descarga forzada de un archivo de Firebase Storage: lo trae del lado del servidor y lo
 * devuelve con `Content-Disposition: attachment`, evitando el bloqueo de CORS del navegador.
 * Antes era /api/tickets/download del minisitio (sin sesión); ahora exige sesión.
 *
 *   GET /minisitio/archivos/descarga?url=<firebase-url>&name=<nombre>
 */
export async function GET(request: NextRequest) {
  if (!(await readCondominoSession())) {
    return NextResponse.json({ message: "Sesión no válida" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  const name = request.nextUrl.searchParams.get("name");
  if (!url) return NextResponse.json({ message: "URL requerida" }, { status: 400 });
  if (!ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return NextResponse.json({ message: "URL no permitida" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ message: `Error al obtener el archivo (${response.status})` }, { status: response.status });
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const safeName = String(name || "documento").replace(/[^a-zA-Z0-9._-]/g, "_");
    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, max-age=0",
      },
    });
  } catch (error) {
    console.error("[minisitio] descarga:", error);
    return NextResponse.json({ message: "Error interno al descargar el archivo" }, { status: 500 });
  }
}
