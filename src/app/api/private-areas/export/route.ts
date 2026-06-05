import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import * as XLSX from "xlsx";

import { PrismaPrivateAreaListingRepository } from "@/modules/private-areas/infrastructure/prisma-private-area-listing.repository";

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

    const repository = new PrismaPrivateAreaListingRepository();
    const listing = await repository.getListing({
      query: "",
      useType: "",
      status: "ALL",
      m2Min: null,
      m2Max: null,
      page: 1,
      pageSize: 100000,
    });

    if (!listing) {
      return new NextResponse("No se encontraron áreas", { status: 404 });
    }

    const areas = listing.rows;

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

    const rows = areas.map(area => [
      area.id,
      area.code || "",
      area.name,
      area.zone || "",
      "", // Subzone is not in row
      "", // Street is not in row
      area.useType || "",
      area.businessStatus,
      area.m2Original ? Number(area.m2Original) : "",
      area.m2Updated ? Number(area.m2Updated) : "",
      area.m2Construction ? Number(area.m2Construction) : "",
      area.m2CommonArea ? Number(area.m2CommonArea) : "",
      area.m2ConstructionChildren ? Number(area.m2ConstructionChildren) : "",
      area.m2CommonAreaChildren ? Number(area.m2CommonAreaChildren) : "",
      area.indiviso ? Number(area.indiviso) : "",
      area.vccc ? Number(area.vccc) : "",
      area.parentName || "", // Re-using parentName as parentCode approximation
      area.isFusionLegacy ? "SI" : "NO",
      area.isActive ? "SI" : "NO"
    ]);

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Areas Privativas");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="areas-privativas.xlsx"',
      },
    });
  } catch (error) {
    console.error("[Export CSV Error]", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
