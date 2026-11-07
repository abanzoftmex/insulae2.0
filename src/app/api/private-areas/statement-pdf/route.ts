import { NextRequest, NextResponse } from "next/server";
import { apiAccessDenied } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { generateAccountStatementPdf } from "@/app/(admin)/areas-privativas/_lib/statement-pdf";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await apiAccessDenied(MODULES.AREAS_PRIVATIVAS);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const rawOpc = searchParams.get("opc");
  const opc: "1" | "2" = rawOpc === "1" ? "1" : "2";

  if (!id || typeof id !== "string") {
    return new NextResponse("Parámetro 'id' de área privativa requerido.", { status: 400 });
  }

  try {
    const { buffer, filename } = await generateAccountStatementPdf(id, opc);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[api/private-areas/statement-pdf] Error generando PDF:", error);
    return new NextResponse(
      `Error al generar el estado de cuenta: ${error?.message || "Error desconocido"}`,
      { status: 500 }
    );
  }
}

