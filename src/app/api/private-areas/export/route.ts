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
      "Activo", // Badge status "Activo" / "Inactivo"
      
      // Financial columns
      "Cartera Vencida 2017-2024",
      "Pago Anticipado 2024",
      "Cuotas ordinarias 2025 (anual)",
      "Cuotas ordinarias 2025 (mensual)",
      "Cuotas ordinarias 2025 (saldo actual)",
      "Cuotas ordinarias 2026 (anual)",
      "Cuotas ordinarias 2026 (mensual)",
      "Cuotas ordinarias 2026 (saldo actual)",
      "Cuotas extraordinarias - Condóminos 2024 - 2025",
      "Cuotas extraordinarias - Condóminos 2024 - 2025 (saldo actual)",
      "Cuota extraordinaria - Comercios 2024 - 2025",
      "Cuota extraordinaria - Comercios 2024 - 2025 (saldo actual)",
      "Cuotas STC",
      "Cuotas STC (saldo actual)",
      "Sanción",
      "Sanción (saldo actual)",
      "Comodato",
      "Comodato (saldo actual)",
      "Saldo actual",
      
      // Months columns
      ...monthLabels.map(m => m.label),
      
      // Contacts
      "Propietario inicial",
      "Propietario legal",
      "Dominio actual",
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
        area.name,
        area.zone || "",
        "", // Subzone is not in row
        "", // Street is not in row
        area.useType || "",
        area.businessStatusLabel || "",
        parseNum(area.m2Original),
        parseNum(area.m2Updated),
        parseNum(area.m2Construction),
        parseNum(area.m2CommonArea),
        parseNum(area.m2ConstructionChildren),
        parseNum(area.m2CommonAreaChildren),
        parseNum(area.indiviso),
        parseNum(area.vccc),
        area.parentName || "",
        area.hierarchyLabel === "Fusion" ? "SI" : "NO",
        area.statusLabel, // Exactly "Activo" or "Inactivo"

        // Financial columns
        getFinancialText("arrears_2017_2024"),
        getFinancialText("advance_2024"),
        getFinancialText("ordinary_2025_annual"),
        getFinancialText("ordinary_2025_monthly"),
        getFinancialText("ordinary_2025_outstanding"),
        getFinancialText("ordinary_2026_annual"),
        getFinancialText("ordinary_2026_monthly"),
        getFinancialText("ordinary_2026_outstanding"),
        getFinancialText("extra_condo_2024_2025"),
        getFinancialText("extra_condo_2024_2025_outstanding"),
        getFinancialText("extra_commerce_2024_2025"),
        getFinancialText("extra_commerce_2024_2025_outstanding"),
        getFinancialText("stc"),
        getFinancialText("stc_outstanding"),
        getFinancialText("sancion"),
        getFinancialText("sancion_outstanding"),
        getFinancialText("comodato"),
        getFinancialText("comodato_outstanding"),
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
