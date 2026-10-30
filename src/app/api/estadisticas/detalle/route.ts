import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getKpiDetailUseCase, isKpiKey } from "@/modules/statistics";
import { apiAccessDenied } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // El middleware no cubre /api: sin esto, cualquiera descargaba correos y teléfonos de los propietarios.
  const denied = await apiAccessDenied(MODULES.REPORTE_CONDOMINIO);
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const kpi = searchParams.get("kpi") ?? "";

  if (!isKpiKey(kpi)) {
    return NextResponse.json({ error: "Indicador no reconocido" }, { status: 400 });
  }

  try {
    const detail = await getKpiDetailUseCase.execute(kpi, {
      zone: searchParams.get("zona"),
      useType: searchParams.get("uso"),
    });

    if (!detail) {
      return NextResponse.json({ error: "Condominio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("[estadisticas/detalle] error", error);
    return NextResponse.json({ error: "No se pudo cargar el detalle" }, { status: 500 });
  }
}
