import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import * as XLSX from "xlsx";

import { PrismaPrivateAreaListingRepository } from "@/modules/private-areas/infrastructure/prisma-private-area-listing.repository";
import { toPrivateAreaListingVM } from "@/modules/private-areas/presentation/private-area-listing.vm";

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
      status: "ACTIVE",
      m2Min: null,
      m2Max: null,
      page: 1,
      pageSize: 100000,
      paginateByTopLevel: true,
    });

    if (!listing) {
      return new NextResponse("No se encontraron áreas", { status: 404 });
    }

    const listingVm = toPrivateAreaListingVM(listing);
    const areas = listingVm.rows;

    const shortMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthLabels: { label: string; key: string }[] = [];
    const startDate = new Date(Date.UTC(2025, 0, 1));
    const endDate = new Date(Date.UTC(2026, 11, 1));
    let curr = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    
    while (curr <= end) {
      const m = curr.getUTCMonth();
      const y = curr.getUTCFullYear();
      monthLabels.push({ label: `${shortMonths[m]} ${y}`, key: `month_${y}_${m + 1}` });
      curr.setUTCMonth(curr.getUTCMonth() + 1);
    }

    // Generate CSV Header matching the requested screen layout columns (actions excluded)
    // ID and Código are placed at the beginning to allow robust updates via importer.
    const headers = [
      "ID",
      "Código",
      "Ubicación",
      "Área privativa/ Fracción de área privativa",
      "Tipo de Apol",
      "Nivel",
      "Superficie m2 área privativa actualizado",
      "Superficie m2 área privativa original",
      "Indiviso del área privativa",
      "m2 Áreas comunes del condominio",
      "m2 Totales área privativa",
      "m2 construcción áreas comunes",
      "m2 de construcción AP/FAP",
      "m2 Áreas comunes subcondominio",
      "m2 Totales FAP",
      "% Indiviso FAP",
      "Indiviso FAP/Condominio",
      "VCCC",
      "Uso de suelo",
      "Saldo actual",
      ...monthLabels.map(m => m.label),
      "Propietario inicial\n(BLOCKCHAIN) Historia",
      "Propietario legal\n(Esta columna es para el INIDIVISO)",
      "Dominio actual\n(Esta columna es para el ESTADO DE CUENTA)",
      "Dominio pleno",
      "Arrendatario / Usuario",
      "Contacto administrativo del arrendamiento",
      "Contacto operativo del arrendamiento"
    ];

    const parseNum = (val: string) => {
      if (!val) return "";
      const cleaned = val.replace(/[^0-9.-]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? "" : num;
    };

    const formatContacts = (contacts: any[]) => {
      if (!contacts || contacts.length === 0) return "—";
      return contacts.map(c => {
        const details = [];
        if (c.email) details.push(c.email);
        if (c.phone) details.push(c.phone);
        return details.length > 0 ? `${c.name} (${details.join(", ")})` : c.name;
      }).join(" | ");
    };

    const rows = areas.map(area => {
      const getFinancialText = (key: string) => {
        const cell = area.financialCells[key as keyof typeof area.financialCells];
        if (!cell) return "$0.00";
        if (area.hasRentalLabel === "Si") {
          return `P: ${cell.owner} / C: ${cell.commerce}`;
        }
        return cell.owner;
      };

      return [
        area.id,
        area.code || "",
        area.zone || "",
        area.name,
        area.hierarchyLabel || "",
        area.level || "",
        parseNum(area.m2Updated),
        parseNum(area.m2Original),
        area.indiviso || "",
        parseNum(area.m2CommonArea),
        parseNum(area.totalAreaM2),
        parseNum(area.m2ConstructionCommonArea),
        parseNum(area.m2Construction),
        parseNum(area.m2CommonAreaChildren),
        parseNum(area.m2ConstructionChildren),
        area.indivisoFap || "",
        area.indivisoCondominio || "",
        area.vccc || "",
        area.useType || "",
        getFinancialText("total_outstanding"),
        
        // Months columns
        ...monthLabels.map(m => getFinancialText(m.key)),

        // Contact columns
        formatContacts(area.ownerInitialHistory),
        formatContacts(area.ownerLegal),
        formatContacts(area.domainCurrent),
        formatContacts(area.domainFull),
        formatContacts(area.tenantUsers),
        formatContacts(area.rentalAdministrativeContacts),
        formatContacts(area.rentalOperationalContacts)
      ];
    });

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
