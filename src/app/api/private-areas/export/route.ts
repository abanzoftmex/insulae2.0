import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const condominium = await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true },
    });

    if (!condominium) {
      return new NextResponse("Condominio inactivo o no encontrado", { status: 400 });
    }

    const areas = await prisma.privateArea.findMany({
      where: { condominiumId: condominium.id },
      include: {
        parentPrivateArea: {
          select: { code: true }
        }
      },
      orderBy: { sortOrder: "asc" }
    });

    // Generate CSV Header
    const headers = [
      "ID",
      "Código",
      "Nombre",
      "Zona",
      "Subzona",
      "Calle",
      "Tipo Uso",
      "Estatus",
      "M2 Original",
      "M2 Actual",
      "M2 Construcción",
      "M2 Comunes",
      "M2 Construcción Hijos",
      "M2 Comunes Hijos",
      "Indiviso",
      "VCCC",
      "Código Padre",
      "Es Fusión",
      "Activo"
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (str === null || str === undefined) return "";
      const text = String(str);
      if (text.includes(",") || text.includes("\\\"") || text.includes("\\n") || text.includes('"')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = areas.map(area => [
      area.id,
      area.code || "",
      area.name,
      area.zone || "",
      area.subzone || "",
      area.street || "",
      area.useType || "",
      area.status,
      area.m2Original?.toString() || "",
      area.m2Apole?.toString() || "",
      area.m2Construction?.toString() || "",
      area.m2CommonArea?.toString() || "",
      area.m2ConstructionChildren?.toString() || "",
      area.m2CommonAreaChildren?.toString() || "",
      area.indiviso?.toString() || "",
      area.vccc?.toString() || "",
      area.parentPrivateArea?.code || "",
      area.isFusion ? "SI" : "NO",
      area.isActive ? "SI" : "NO"
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="areas-privativas.csv"',
      },
    });
  } catch (error) {
    console.error("[Export CSV Error]", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
