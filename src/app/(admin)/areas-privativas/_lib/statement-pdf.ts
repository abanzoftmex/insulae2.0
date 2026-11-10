import { getPrivateAreaActionPageDataUseCase } from "@/modules/private-area-actions";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { jsPDF } from "jspdf";
import fs from "node:fs";
import path from "node:path";
import { formatCurrency, formatDate } from "./private-area-action-routing";

const MONTHS_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

function formatPeriodMonth(m: number): string {
  return MONTHS_SHORT[m - 1] || String(m);
}

export interface StatementPdfResult {
  buffer: Buffer;
  filename: string;
  summary: {
    totalBalance: number;
    totalCharged: number;
    totalInterests: number;
    displayM2: number;
  };
}

/**
 * Genera el archivo PDF real del estado de cuenta de un área privativa con el diseño
 * ejecutivo institucional (azul principal #304854, dorado beige #d0b685, negro y blanco,
 * tarjetas de composición de saldo, proporción de pagos y formas de pago bancarias).
 * Idéntico a la vista descargable de /imprimir.
 */
export async function generateAccountStatementPdf(
  privateAreaId: string,
  opc: "1" | "2" = "2"
): Promise<StatementPdfResult> {
  if (!privateAreaId || typeof privateAreaId !== "string") {
    throw new Error("Identificador de área privativa inválido.");
  }

  // 1. Obtener la misma fuente de datos canónica que utiliza la pantalla de imprimir
  const pageData = await getPrivateAreaActionPageDataUseCase.execute({
    privateAreaId,
    opc,
  });

  if (!pageData) {
    throw new Error(`Área privativa no encontrada (ID: ${privateAreaId})`);
  }

  const { area } = pageData;

  // 2. Mapeo de cargos visibles idéntico a imprimir/page.tsx
  const mappedCharges = pageData.visibleChargeLines.map((c) => {
    return {
      id: c.id,
      periodYear: c.periodYear,
      periodMonth: c.periodMonth,
      dueDate: c.dueDate,
      concept: c.concept,
      chargeGroupName: c.chargeGroupName,
      chargeGroupType: c.chargeGroupType,
      amount: c.amount,
      interestAmount: c.interestAmount,
      discountAmount: c.discountAmount,
      paidAmount: c.paidAmount,
      balanceAmount: c.balanceAmount,
      paidDatesList: c.paymentDates,
    };
  });

  // 3. Mapeo de pagos visibles idéntico a imprimir/page.tsx
  const chronologicalPayments = [...pageData.visiblePaymentMovements].sort(
    (a, b) => a.paidAt.getTime() - b.paidAt.getTime()
  );

  // 4. Cálculos idénticos a imprimir/page.tsx
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const isPastOrCurrentPeriod = (year: number, month: number) => {
    return year < todayYear || (year === todayYear && month <= todayMonth);
  };

  const pastOrCurrentCharges = mappedCharges.filter((c) =>
    isPastOrCurrentPeriod(c.periodYear, c.periodMonth)
  );

  // DEBE AL DÍA calculations (Card 1)
  const totalBalance = pastOrCurrentCharges.reduce((sum, c) => sum + c.balanceAmount, 0);

  // Grouped balances for Debe al día breakdown list
  let ordinariasBalance = 0;
  let extraordinariasCondominosBalance = 0;
  let stcBalance = 0;
  let sancionBalance = 0;
  let extraordinariaComerciosBalance = 0;
  let comodatoBalance = 0;
  let interesesBalance = 0;

  for (const c of pastOrCurrentCharges) {
    const name = c.chargeGroupName.toLowerCase();
    const type = (c.chargeGroupType ?? "").toLowerCase();

    interesesBalance += c.interestAmount;

    if (name.includes("ordinaria")) {
      ordinariasBalance += c.balanceAmount;
    } else if (name.includes("stc")) {
      stcBalance += c.balanceAmount;
    } else if (name.includes("sancion") || name.includes("multa")) {
      sancionBalance += c.balanceAmount;
    } else if (name.includes("comodato")) {
      comodatoBalance += c.balanceAmount;
    } else if (name.includes("extraordinaria")) {
      if (name.includes("comercio") || type.includes("comercio")) {
        extraordinariaComerciosBalance += c.balanceAmount;
      } else {
        extraordinariasCondominosBalance += c.balanceAmount;
      }
    }
  }

  // CARGOS TOTALES calculations (Card 2)
  const totalChargedAmount = mappedCharges.reduce((sum, c) => sum + c.amount, 0);
  const totalInterestsCharged = mappedCharges.reduce((sum, c) => sum + c.interestAmount, 0);
  const totalDiscounts = mappedCharges.reduce((sum, c) => sum + c.discountAmount, 0);
  const totalCargosCard = totalChargedAmount + totalInterestsCharged - totalDiscounts;

  // Grouped amounts for Cargos Totales breakdown list
  let ordinariasCharged = 0;
  let extraordinariasCondominosCharged = 0;
  let stcCharged = 0;
  let sancionCharged = 0;
  let extraordinariaComerciosCharged = 0;
  let comodatoCharged = 0;

  for (const c of mappedCharges) {
    const name = c.chargeGroupName.toLowerCase();
    const type = (c.chargeGroupType ?? "").toLowerCase();

    if (name.includes("ordinaria")) {
      ordinariasCharged += c.amount;
    } else if (name.includes("stc")) {
      stcCharged += c.amount;
    } else if (name.includes("sancion") || name.includes("multa")) {
      sancionCharged += c.amount;
    } else if (name.includes("comodato")) {
      comodatoCharged += c.amount;
    } else if (name.includes("extraordinaria")) {
      if (name.includes("comercio") || type.includes("comercio")) {
        extraordinariaComerciosCharged += c.amount;
      } else {
        extraordinariasCondominosCharged += c.amount;
      }
    }
  }

  // 5. Contact resolution identical to imprimir/page.tsx
  let contactUser: { name: string; email: string | null; phone: string | null } | undefined;

  if (opc === "1") {
    // Comercio (opc=1): arrendamiento con contacto administrativo
    const rentalsWithContact = await prisma.rental.findMany({
      where: { privateAreaId: area.privateAreaId },
      orderBy: { startsAt: "desc" },
      include: {
        administrativeContactUser: {
          select: { id: true, firstName: true, lastName: true, businessName: true, email: true, phone: true },
        },
      },
    });
    const activeRental = rentalsWithContact.find((r) => r.administrativeContactUser != null);
    const rc = activeRental?.administrativeContactUser;
    if (rc) {
      const fullName = rc.businessName?.trim() || `${rc.firstName ?? ""} ${rc.lastName ?? ""}`.trim();
      contactUser = { name: fullName || "—", email: rc.email, phone: rc.phone };
    }
  } else {
    // Propietario (opc=2): asignación propietario / dueño / administrador
    const ownerAssignment =
      area.assignments.find((a) =>
        (a.roleName || "").toLowerCase().includes("propietario") ||
        (a.roleName || "").toLowerCase().includes("dueño")
      ) ??
      area.assignments.find((a) =>
        (a.roleName || "").toLowerCase().includes("administrador")
      ) ??
      area.assignments.find((a) => a.roleBucket === "ACTUAL");
    contactUser = ownerAssignment?.user;
  }

  // M2 calculation matching legacy and imprimir/page.tsx
  const m2Construction = area.m2Construction ?? 0;
  const m2CommonArea = area.m2CommonArea ?? 0;
  const m2OriginalVal = area.m2Original ?? 0;
  const m2ApoleVal = area.m2Apole ?? 0;
  const displayM2 = area.isChild
    ? m2Construction + m2CommonArea
    : (m2OriginalVal > 0 ? m2OriginalVal : m2ApoleVal) + m2CommonArea;

  const formattedCutDate = formatDate(today);
  const formattedCutDateUpper = formattedCutDate.toUpperCase();

  // Max payment amount for proportion bars
  const maxPaymentAmount = Math.max(
    ...chronologicalPayments.map((p) => p.paymentTotalAmount),
    1
  );

  // Status helper for section 04
  const getStatusBadgeData = (c: typeof mappedCharges[number]) => {
    if (c.balanceAmount <= 0.005) {
      return {
        label: "PAGADO",
        bgRgb: [232, 245, 233] as [number, number, number],
        textRgb: [27, 94, 32] as [number, number, number],
      };
    }
    if (c.paidAmount > 0.005) {
      return {
        label: "PARCIAL",
        bgRgb: [255, 248, 225] as [number, number, number],
        textRgb: [183, 129, 3] as [number, number, number],
      };
    }
    const isPast =
      c.periodYear < todayYear ||
      (c.periodYear === todayYear && c.periodMonth <= todayMonth) ||
      (c.dueDate && new Date(c.dueDate) < today);

    if (isPast) {
      return {
        label: "VENCIDO",
        bgRgb: [255, 235, 238] as [number, number, number],
        textRgb: [198, 40, 40] as [number, number, number],
      };
    }
    return {
      label: "POR VENCER",
      bgRgb: [255, 243, 224] as [number, number, number],
      textRgb: [230, 81, 0] as [number, number, number],
    };
  };

  // 6. Configuración y renderizado con jsPDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 191.9 mm

  // Carga de logo institucional (mismo de la cabecera del dashboard: /brand/valquirico-logo-light.png)
  let logoBase64: string | null = null;
  const possibleLogoPaths = [
    path.join(process.cwd(), "public", "brand", "valquirico-logo-light.png"),
    path.resolve("./public/brand/valquirico-logo-light.png"),
  ];
  for (const p of possibleLogoPaths) {
    if (fs.existsSync(p)) {
      try {
        const buffer = fs.readFileSync(p);
        if (buffer.length > 0) {
          logoBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
          break;
        }
      } catch {
        logoBase64 = null;
      }
    }
  }

  // ========================================================
  // PAGE 1: RESUMEN EJECUTIVO (Idéntico a imprimir/page.tsx)
  // ========================================================

  // --- Top Navy Header Banner (#304854) ---
  const headerHeight = 36;
  doc.setFillColor(48, 72, 84); // #304854
  doc.roundedRect(marginX, 10, contentWidth, headerHeight, 3, 3, "F");

  // Logo (1077 x 290 px -> ratio 3.7138 : 1)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", marginX + 4, 12.5, 33.5, 9.02, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(208, 182, 133); // #d0b685
      doc.text("VAL'QUIRICO", marginX + 4, 19);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(208, 182, 133); // #d0b685
    doc.text("VAL'QUIRICO", marginX + 4, 19);
  }

  // Right Header Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("ADMINISTRADORA VALQUIRICO A.C.", marginX + contentWidth - 4, 15, { align: "right" });

  doc.setFontSize(6.5);
  doc.setTextColor(208, 182, 133); // Gold #d0b685
  doc.text(`CORTE AL ${formattedCutDateUpper}`, marginX + contentWidth - 4, 19, { align: "right" });

  // Subtitle & Main Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text("SISTEMA CONDOMINAL · REPORTE EJECUTIVO", marginX + 4, 28);

  doc.setFont("times", "normal");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text("Estado de ", marginX + 4, 37);
  const wEstadoDe = doc.getTextWidth("Estado de ");
  doc.setFont("times", "italic");
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text("cuenta", marginX + 4 + wEstadoDe, 37);

  // Área Privativa Top Badge (Right side of header)
  const badgeCardWidth = 52;
  const badgeCardHeight = 18;
  const badgeCardX = marginX + contentWidth - badgeCardWidth - 4;
  const badgeCardY = 24;

  doc.setFillColor(38, 58, 68); // #304854 tint
  doc.setDrawColor(208, 182, 133); // Gold #d0b685 border
  doc.setLineWidth(0.35);
  doc.roundedRect(badgeCardX, badgeCardY, badgeCardWidth, badgeCardHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text("ÁREA PRIVATIVA", badgeCardX + badgeCardWidth - 4, badgeCardY + 4.5, { align: "right" });

  doc.setFont("courier", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text(area.name, badgeCardX + badgeCardWidth - 4, badgeCardY + 10.5, { align: "right" });

  // Gold divider line in badge
  doc.setDrawColor(208, 182, 133);
  doc.setLineWidth(0.3);
  doc.line(badgeCardX + 12, badgeCardY + 12, badgeCardX + badgeCardWidth - 4, badgeCardY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(240, 245, 255);
  doc.text(`${displayM2.toFixed(2)} m²`, badgeCardX + badgeCardWidth - 4, badgeCardY + 15.5, { align: "right" });

  // --- 3 Floating KPI Cards ---
  const kpiY = 50;
  const kpiHeight = 22;
  const kpiGap = 3.5;
  const kpiWidth = (contentWidth - kpiGap * 2) / 3;

  // Card 1: DEBE AL DÍA
  const c1X = marginX;
  doc.setFillColor(252, 246, 237); // Warm cream #fcf6ed
  doc.setDrawColor(237, 217, 188); // #edd9bc
  doc.setLineWidth(0.3);
  doc.roundedRect(c1X, kpiY, kpiWidth, kpiHeight, 2, 2, "FD");

  doc.setFillColor(220, 38, 38); // Red dot #dc2626
  doc.circle(c1X + 4.5, kpiY + 4.5, 0.9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(154, 52, 18); // #9a3412
  doc.text("DEBE AL DÍA", c1X + 7, kpiY + 5.2);

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.setTextColor(139, 30, 15); // #8b1e0f
  doc.text(formatCurrency(totalBalance), c1X + 4, kpiY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(120, 113, 108); // #78716c
  const debtSub =
    totalInterestsCharged > 0
      ? `Incluye int. moratorios por ${formatCurrency(totalInterestsCharged)}`
      : "Cuenta al corriente de cargos";
  doc.text(debtSub.slice(0, 38), c1X + 4, kpiY + 18.5);

  // Card 2: SALDO A FAVOR
  const c2X = marginX + kpiWidth + kpiGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c2X, kpiY, kpiWidth, kpiHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("SALDO A FAVOR", c2X + 4, kpiY + 5.2);

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text("$0.00", c2X + 4, kpiY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Sin saldo disponible", c2X + 4, kpiY + 18.5);

  // Card 3: CARGOS TOTALES
  const c3X = marginX + (kpiWidth + kpiGap) * 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c3X, kpiY, kpiWidth, kpiHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("CARGOS TOTALES", c3X + 4, kpiY + 5.2);

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(totalCargosCard), c3X + 4, kpiY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Histórico acumulado", c3X + 4, kpiY + 18.5);

  // Helper para dibujar encabezado de sección con numeración dorada
  const drawSectionHeader = (y: number, num: string, title: string) => {
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(208, 182, 133); // Gold #d0b685
    doc.text(num, marginX, y);

    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0); // Black #000000
    doc.text(title, marginX + 6, y);

    const titleWidth = doc.getTextWidth(title);
    doc.setDrawColor(229, 223, 213); // #e5dfd5
    doc.setLineWidth(0.25);
    doc.line(marginX + 8 + titleWidth, y - 0.7, marginX + contentWidth, y - 0.7);
  };

  // --- Section 01: Datos de la propiedad ---
  let currentY = 76;
  drawSectionHeader(currentY, "01", "Datos de la propiedad");

  currentY += 3.5;
  const propBoxHeight = 25;
  doc.setFillColor(251, 249, 245); // #fbf9f5
  doc.setDrawColor(236, 230, 219); // #ece6db
  doc.roundedRect(marginX, currentY, contentWidth, propBoxHeight, 2, 2, "FD");

  const colW = contentWidth / 4;
  const row1Y = currentY + 4.5;

  // Fila 1
  // Col 1: Área Privativa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ÁREA PRIVATIVA", marginX + 4, row1Y);
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(area.name, marginX + 4, row1Y + 4.5);
  doc.setDrawColor(208, 182, 133); // Gold #d0b685 underline
  doc.setLineWidth(0.3);
  doc.line(marginX + 4, row1Y + 5.5, marginX + 4 + doc.getTextWidth(area.name), row1Y + 5.5);

  // Col 2: Superficie
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SUPERFICIE", marginX + colW + 4, row1Y);
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${displayM2.toFixed(4)} m²`, marginX + colW + 4, row1Y + 4.5);

  // Col 3: Fecha de corte
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("FECHA DE CORTE", marginX + colW * 2 + 4, row1Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedCutDate, marginX + colW * 2 + 4, row1Y + 4.5);

  // Col 4: Administra
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ADMINISTRA", marginX + colW * 3 + 4, row1Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text("Administradora Valquirico A.C.", marginX + colW * 3 + 4, row1Y + 4.5);

  // Línea divisoria interna
  doc.setDrawColor(238, 232, 220);
  doc.setLineWidth(0.2);
  doc.line(marginX + 4, currentY + 12.5, marginX + contentWidth - 4, currentY + 12.5);

  // Fila 2
  const row2Y = currentY + 16.5;
  const titularLabel = opc === "1" ? "ARRENDATARIO / CONTACTO" : "PROPIETARIO / TITULAR";

  // Col 1: Titular
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(titularLabel, marginX + 4, row2Y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text((contactUser?.name || "—").slice(0, 26), marginX + 4, row2Y + 4.5);

  // Col 2: Correo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("CORREO ELECTRÓNICO", marginX + colW + 4, row2Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text((contactUser?.email || "—").slice(0, 28), marginX + colW + 4, row2Y + 4.5);

  // Col 3: Teléfono
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("TELÉFONO", marginX + colW * 2 + 4, row2Y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(contactUser?.phone || "—", marginX + colW * 2 + 4, row2Y + 4.5);

  // Col 4: Responsabilidad Badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("RESPONSABILIDAD", marginX + colW * 3 + 4, row2Y);

  if (opc === "1") {
    // Comercio (C)
    doc.setFillColor(255, 245, 199); // #fff5c7
    doc.setDrawColor(255, 222, 107);
    doc.roundedRect(marginX + colW * 3 + 4, row2Y + 1.8, 24, 4.2, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(120, 53, 15); // #78350f
    doc.text("Comercio (C)", marginX + colW * 3 + 16, row2Y + 4.8, { align: "center" });
  } else {
    // Propietario (P)
    doc.setFillColor(224, 236, 255); // #e0ecff
    doc.setDrawColor(199, 219, 255);
    doc.roundedRect(marginX + colW * 3 + 4, row2Y + 1.8, 25, 4.2, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138); // #1e3a8a
    doc.text("Propietario (P)", marginX + colW * 3 + 16.5, row2Y + 4.8, { align: "center" });
  }

  currentY += propBoxHeight + 6;

  // --- Section 02: Composición del saldo ---
  drawSectionHeader(currentY, "02", "Composición del saldo");

  currentY += 3.5;
  const compCardW = (contentWidth - 4) / 2; // 93.9 mm
  const compCardH = 46;

  // Tarjeta Izquierda: ADEUDO AL DÍA
  const cLeftX = marginX;
  doc.setFillColor(251, 249, 245);
  doc.setDrawColor(236, 230, 219);
  doc.roundedRect(cLeftX, currentY, compCardW, compCardH, 2, 2, "FD");

  // Header Adeudo al día
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(154, 52, 18);
  doc.text("ADEUDO AL DÍA", cLeftX + 4, currentY + 4.8);

  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(139, 30, 15);
  doc.text(formatCurrency(totalBalance), cLeftX + compCardW - 4, currentY + 4.8, { align: "right" });

  doc.setDrawColor(236, 230, 219);
  doc.setLineWidth(0.2);
  doc.line(cLeftX + 4, currentY + 6.8, cLeftX + compCardW - 4, currentY + 6.8);

  const drawCompRow = (
    baseX: number,
    y: number,
    label: string,
    valStr: string,
    isBold = false,
    colorRgb: [number, number, number] = [71, 85, 105]
  ) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(6);
    doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
    doc.text(label, baseX + 4, y);

    doc.setFont("courier", isBold ? "bold" : "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...colorRgb);
    doc.text(valStr, baseX + compCardW - 4, y, { align: "right" });

    // Dotted guide line
    doc.setDrawColor(230, 235, 242);
    doc.setLineWidth(0.15);
    doc.line(baseX + 4, y + 1.2, baseX + compCardW - 4, y + 1.2);
  };

  let rowY = currentY + 10.5;
  drawCompRow(cLeftX, rowY, "Saldo inicial", "$0.00");
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Cuotas ordinarias", formatCurrency(ordinariasBalance));
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Cuotas extraordinarias – Condóminos", formatCurrency(extraordinariasCondominosBalance));
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Cuotas STC", formatCurrency(stcBalance));
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Sanción", formatCurrency(sancionBalance));
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Cuota extraordinaria – Comercios", formatCurrency(extraordinariaComerciosBalance));
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Comodato", formatCurrency(comodatoBalance));
  rowY += 4.2;
  drawCompRow(cLeftX, rowY, "Intereses moratorios", formatCurrency(interesesBalance), true, [139, 30, 15]);

  // Tarjeta Derecha: CARGOS TOTALES
  const cRightX = marginX + compCardW + 4;
  doc.setFillColor(251, 249, 245);
  doc.setDrawColor(236, 230, 219);
  doc.roundedRect(cRightX, currentY, compCardW, compCardH, 2, 2, "FD");

  // Header Cargos totales
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(184, 134, 11); // Gold
  doc.text("CARGOS TOTALES", cRightX + 4, currentY + 4.8);

  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalCargosCard), cRightX + compCardW - 4, currentY + 4.8, { align: "right" });

  doc.setDrawColor(236, 230, 219);
  doc.setLineWidth(0.2);
  doc.line(cRightX + 4, currentY + 6.8, cRightX + compCardW - 4, currentY + 6.8);

  rowY = currentY + 10.5;
  drawCompRow(cRightX, rowY, "Saldo inicial", "$0.00");
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Cuotas ordinarias", formatCurrency(ordinariasCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Cuotas extraordinarias – Condóminos", formatCurrency(extraordinariasCondominosCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Cuotas STC", formatCurrency(stcCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Sanción", formatCurrency(sancionCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Cuota extraordinaria – Comercios", formatCurrency(extraordinariaComerciosCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Comodato", formatCurrency(comodatoCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Intereses moratorios", formatCurrency(totalInterestsCharged));
  rowY += 3.8;
  drawCompRow(cRightX, rowY, "Descuentos", formatCurrency(totalDiscounts));

  currentY += compCardH + 6;

  // --- Section 03: Últimos pagos realizados ---
  drawSectionHeader(currentY, "03", "Últimos pagos realizados");

  currentY += 3.5;
  const paymentsHeaderH = 5.2;

  doc.setFillColor(48, 72, 84); // #304854
  doc.rect(marginX, currentY, contentWidth, paymentsHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text("FOLIO", marginX + 4, currentY + 3.6);
  doc.text("PAGADO EL", marginX + 56, currentY + 3.6);
  doc.text("PROPORCIÓN", marginX + 102, currentY + 3.6);
  doc.text("ABONO", marginX + contentWidth - 4, currentY + 3.6, { align: "right" });

  currentY += paymentsHeaderH;

  const paymentsToShow = chronologicalPayments.slice(-8); // Hasta 8 pagos recientes para que quepa perfecto en la página 1

  if (paymentsToShow.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, currentY, contentWidth, 8, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No hay pagos registrados para esta área", marginX + contentWidth / 2, currentY + 5, { align: "center" });
    currentY += 8;
  } else {
    paymentsToShow.forEach((p, index) => {
      const isEven = index % 2 === 1;
      const rowHeight = 4.6;

      doc.setFillColor(isEven ? 250 : 255, isEven ? 248 : 255, isEven ? 245 : 255);
      doc.rect(marginX, currentY, contentWidth, rowHeight, "F");

      // Folio
      doc.setFont("courier", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      const folio = p.reference || p.paymentId.substring(0, 8);
      doc.text(folio.slice(0, 20), marginX + 4, currentY + 3.2);

      // Fecha
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(formatDate(p.paidAt), marginX + 56, currentY + 3.2);

      // Barra de proporción dorada
      const barTrackW = 38;
      const barTrackH = 1.8;
      const barX = marginX + 102;
      const barY = currentY + 1.8;

      doc.setFillColor(232, 226, 213); // #e8e2d5
      doc.roundedRect(barX, barY, barTrackW, barTrackH, 0.8, 0.8, "F");

      const pct = Math.min(1, Math.max(0.06, p.paymentTotalAmount / maxPaymentAmount));
      doc.setFillColor(208, 182, 133); // Gold #d0b685
      doc.roundedRect(barX, barY, barTrackW * pct, barTrackH, 0.8, 0.8, "F");

      // Abono
      doc.setFont("courier", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(p.paymentTotalAmount), marginX + contentWidth - 4, currentY + 3.2, { align: "right" });

      currentY += rowHeight;
    });
  }

  // Footer Página 1
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(229, 223, 213);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "ESTE COMPROBANTE ES UN ESTADO DE CUENTA INTERNO Y NO TIENE VALIDEZ FISCAL",
      marginX,
      pageHeight - 8.5
    );

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`PÁGINA ${pageNum} DE ${totalPages}`, marginX + contentWidth, pageHeight - 8.5, { align: "right" });
  };

  drawPageFooter(1, 2);

  // ========================================================
  // PAGE 2: DETALLE DE CUOTAS Y FORMAS DE PAGO (Imprimir/page.tsx)
  // ========================================================
  doc.addPage();

  // --- Slim Navy Header Page 2 ---
  const p2HeaderH = 12;
  doc.setFillColor(48, 72, 84); // #304854
  doc.roundedRect(marginX, 10, contentWidth, p2HeaderH, 2, 2, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", marginX + 4, 12, 26, 7.0, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(208, 182, 133); // #d0b685
      doc.text("VAL'QUIRICO", marginX + 4, 17.5);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(208, 182, 133); // #d0b685
    doc.text("VAL'QUIRICO", marginX + 4, 17.5);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text(`CORTE ${formattedCutDateUpper}`, marginX + contentWidth - 4, 14, { align: "right" });

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Detalle de movimientos", marginX + contentWidth - 4, 18.5, { align: "right" });

  // --- Section 04: Detalle de cuotas ---
  currentY = 27;
  drawSectionHeader(currentY, "04", "Detalle de cuotas");

  currentY += 3.5;
  const cuotasHeaderH = 5.2;

  const drawCuotasTableHeader = (y: number) => {
    doc.setFillColor(48, 72, 84); // #304854
    doc.rect(marginX, y, contentWidth, cuotasHeaderH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(255, 255, 255);

    // Columns: Concepto (38), Cobro (18), Límite (18), Pagado el (22), Cargo (18), Abono (18), Int (16), Desc (14), Saldo (18), Estatus (15)
    doc.text("CONCEPTO", marginX + 3, y + 3.5);
    doc.text("COBRO", marginX + 42, y + 3.5);
    doc.text("LÍMITE", marginX + 60, y + 3.5);
    doc.text("PAGADO EL", marginX + 78, y + 3.5);
    doc.text("CARGO", marginX + 116, y + 3.5, { align: "right" });
    doc.text("ABONO", marginX + 134, y + 3.5, { align: "right" });
    doc.text("INT. MOR.", marginX + 150, y + 3.5, { align: "right" });
    doc.text("DESC.", marginX + 164, y + 3.5, { align: "right" });
    doc.text("SALDO", marginX + 180, y + 3.5, { align: "right" });
    doc.text("ESTATUS", marginX + 186.5, y + 3.5);
  };

  drawCuotasTableHeader(currentY);
  currentY += cuotasHeaderH;

  // Calculamos espacio máximo para que quepan las Formas de Pago abajo en la misma página 2
  // Las formas de pago miden ~42mm. Límite de tabla en página 2: 215mm.
  const page2TableLimit = 210;

  mappedCharges.forEach((c, index) => {
    if (currentY > page2TableLimit) {
      // Si hay muchísimos cargos, agregar página adicional manteniendo orden
      drawPageFooter(doc.getNumberOfPages(), doc.getNumberOfPages() + 1);
      doc.addPage();
      currentY = 12;
      drawCuotasTableHeader(currentY);
      currentY += cuotasHeaderH;
    }

    const isEven = index % 2 === 1;
    const rowH = 4.2;

    doc.setFillColor(isEven ? 250 : 255, isEven ? 248 : 255, isEven ? 245 : 255);
    doc.rect(marginX, currentY, contentWidth, rowH, "F");

    // Concepto
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(15, 23, 42);
    const conceptText = c.concept || `${c.chargeGroupName} ${c.periodYear}`;
    doc.text(conceptText.slice(0, 24), marginX + 3, currentY + 3);

    // Cobro (Fecha)
    const chargeDate = new Date(c.periodYear, c.periodMonth - 1, 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`01 ${formatPeriodMonth(c.periodMonth)} ${String(c.periodYear).slice(-2)}`, marginX + 42, currentY + 3);

    // Límite
    const dueDateStr = c.dueDate ? formatDate(c.dueDate) : "—";
    doc.text(dueDateStr.slice(0, 10), marginX + 60, currentY + 3);

    // Pagado el
    const paidDates = c.paidDatesList && c.paidDatesList.length > 0 ? c.paidDatesList.join(" / ") : "—";
    doc.text(paidDates.slice(0, 16), marginX + 78, currentY + 3);

    // Cargo
    doc.setFont("courier", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(c.amount), marginX + 116, currentY + 3, { align: "right" });

    // Abono
    doc.setFont("courier", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(formatCurrency(c.paidAmount), marginX + 134, currentY + 3, { align: "right" });

    // Int. Mor.
    doc.text(formatCurrency(c.interestAmount), marginX + 150, currentY + 3, { align: "right" });

    // Desc.
    doc.text(formatCurrency(c.discountAmount), marginX + 164, currentY + 3, { align: "right" });

    // Saldo
    doc.setFont("courier", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(c.balanceAmount), marginX + 180, currentY + 3, { align: "right" });

    // Estatus Badge
    const statusData = getStatusBadgeData(c);
    const badgeW = 12;
    const badgeH = 3.2;
    const badgeX = marginX + 182;
    const badgeY = currentY + 0.5;

    doc.setFillColor(...statusData.bgRgb);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 0.6, 0.6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.8);
    doc.setTextColor(...statusData.textRgb);
    doc.text(statusData.label, badgeX + badgeW / 2, badgeY + 2.3, { align: "center" });

    currentY += rowH;
  });

  // --- Section 05: Formas de pago ---
  // Se posiciona en la parte inferior o a continuación
  currentY = Math.max(currentY + 6, 218);
  drawSectionHeader(currentY, "05", "Formas de pago");

  currentY += 3.5;
  const formasH = 40;
  const cardCondW = 112;
  const cardBankW = contentWidth - cardCondW - 4; // 75.9 mm

  // Card Left: CONDICIONES
  doc.setFillColor(251, 249, 245);
  doc.setDrawColor(236, 230, 219);
  doc.roundedRect(marginX, currentY, cardCondW, formasH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(208, 182, 133); // Gold #d0b685
  doc.text("CONDICIONES", marginX + 4, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(51, 65, 85);
  const p1 = "La cuota ordinaria condominal se paga dentro de los primeros 7 días hábiles del mes; a partir del día 8 genera interés moratorio conforme al Reglamento General de Condóminos, artículo 3.9 (mora en los pagos).";
  const p1Lines = doc.splitTextToSize(p1, cardCondW - 8);
  doc.text(p1Lines, marginX + 4, currentY + 8);

  const rules = [
    "1. Sólo se aceptarán pagos mediante transferencia, terminal bancaria y pagos domiciliados.",
    "2. No se aceptan depósitos en efectivo en cuenta bancaria.",
    "3. Identifique su comprobante con concepto VQ# (núm. propiedad), tipo de cuota y mes/año.",
    "4. Pagos no identificados no se reflejarán oportunamente.",
  ];

  let ruleY = currentY + 16.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(30, 41, 59);
  rules.forEach((r) => {
    doc.text(r, marginX + 4, ruleY);
    ruleY += 3.2;
  });

  // RFC & Razón Social al pie de condiciones
  doc.setDrawColor(236, 230, 219);
  doc.setLineWidth(0.2);
  doc.line(marginX + 4, currentY + 34, marginX + cardCondW - 4, currentY + 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(15, 23, 42);
  doc.text("Razón social: ADMINISTRADORA VALQUIRICO A.C.    RFC: AVA1706221G3", marginX + 4, currentY + 37.5);

  // Card Right: DATOS BANCARIOS (Navy dark card #304854)
  const bankX = marginX + cardCondW + 4;
  doc.setFillColor(48, 72, 84); // Navy #304854
  doc.roundedRect(bankX, currentY, cardBankW, formasH, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(208, 182, 133); // Gold #d0b685
  doc.text("DATOS BANCARIOS", bankX + 4, currentY + 4.5);

  // Bank 1: Inbursa
  doc.setFillColor(38, 58, 68); // #304854 tint
  doc.roundedRect(bankX + 4, currentY + 7, cardBankW - 8, 11, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text("BANCO: INBURSA", bankX + 6, currentY + 10.5);

  doc.setFontSize(4.8);
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text("CLABE INTERBANCARIA", bankX + 6, currentY + 13.5);

  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("036650500395989048", bankX + 6, currentY + 16.8);

  // Bank 2: Banco del Bajío
  doc.setFillColor(38, 58, 68); // #304854 tint
  doc.roundedRect(bankX + 4, currentY + 19.5, cardBankW - 8, 11, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text("BANCO: BANCO DEL BAJÍO", bankX + 6, currentY + 23);

  doc.setFontSize(4.8);
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text("CLABE INTERBANCARIA", bankX + 6, currentY + 26);

  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("030650900014356383", bankX + 6, currentY + 29.3);

  // Reference footer inside bank card
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(208, 182, 133); // #d0b685
  doc.text(`Referencia obligatoria: ${area.name}`, bankX + cardBankW / 2, currentY + 36, { align: "center" });

  // Footer Página 2
  const totalPages = doc.getNumberOfPages();
  drawPageFooter(2, totalPages);

  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);
  const safeAreaName = area.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Estado_de_cuenta_${safeAreaName}.pdf`;

  return {
    buffer,
    filename,
    summary: {
      totalBalance,
      totalCharged: totalCargosCard,
      totalInterests: totalInterestsCharged,
      displayM2,
    },
  };
}
