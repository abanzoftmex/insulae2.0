import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getKpiDetailUseCase, isKpiKey } from "@/modules/statistics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
