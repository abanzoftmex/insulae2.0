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
}

/**
 * Genera el archivo PDF real del estado de cuenta de un área privativa con los
 * datos y movimientos exactos que se visualizan en la pantalla y en /imprimir.
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

  if (opc === "2") {
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

  const condoName = area.condominiumName || PROJECT_SCOPE.condominiumName;
  const isSassi = (area.condominiumName || "").toLowerCase().includes("sassi");

  // 6. Configuración y renderizado con jsPDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = 215.9;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 187.9 mm
  let currentY = 14;

  // Barra superior de encabezado
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(formatDate(new Date()), marginX, currentY);
  doc.text(
    isSassi ? "Condominio Sassi del Valle | Sistema Condominal" : "Sistema Condominal | Impresión",
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  currentY += 4;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);

  currentY += 8;

  // Carga de logo institucional local si existe
  const logoCandidate = isSassi
    ? path.join(process.cwd(), "public", "imagenes", "sassi.png")
    : path.join(process.cwd(), "public", "brand", "valquirico-logo-light.png");

  if (fs.existsSync(logoCandidate)) {
    try {
      const imgBuffer = fs.readFileSync(logoCandidate);
      const base64 = `data:image/png;base64,${imgBuffer.toString("base64")}`;
      doc.addImage(base64, "PNG", marginX + contentWidth - 42, currentY - 4, 42, 14, undefined, "FAST");
    } catch {
      // Ignora error si falla carga de logo
    }
  }

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 30, 45);
  doc.text("Estado de cuenta", marginX, currentY + 6);

  currentY += 18;

  // Tarjeta de información del área y contacto (izquierda: 95mm)
  const infoBoxWidth = 95;
  const infoBoxHeight = 36;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 220, 228);
  doc.roundedRect(marginX, currentY, infoBoxWidth, infoBoxHeight, 2, 2, "FD");

  const drawInfoRow = (y: number, label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(label, marginX + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(value, marginX + infoBoxWidth - 4, y, { align: "right" });
  };

  drawInfoRow(currentY + 6, "Área privativa:", area.name);
  drawInfoRow(currentY + 12, "M2:", displayM2 > 0 ? displayM2.toFixed(4) : "—");
  drawInfoRow(currentY + 18, "Nombre:", (contactUser?.name || "—").slice(0, 30));
  drawInfoRow(currentY + 24, "Email:", (contactUser?.email || "—").slice(0, 32));
  drawInfoRow(currentY + 30, "Teléfono:", contactUser?.phone || "—");

  // Tarjetas de resumen financiero (derecha: ~89mm)
  const summaryX = marginX + infoBoxWidth + 4;
  const summaryWidth = contentWidth - infoBoxWidth - 4;

  // Tarjeta: Debe al día
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 220, 228);
  doc.roundedRect(summaryX, currentY, summaryWidth, 17, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("DEBE AL DÍA", summaryX + 6, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(formatCurrency(totalBalance), summaryX + 6, currentY + 13);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("SALDO A FAVOR", summaryX + summaryWidth - 6, currentY + 6, { align: "right" });
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("$0.00", summaryX + summaryWidth - 6, currentY + 13, { align: "right" });

  // Tarjeta: Cargos totales
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 220, 228);
  doc.roundedRect(summaryX, currentY + 19, summaryWidth, 17, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("CARGOS TOTALES", summaryX + 6, currentY + 25);
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(formatCurrency(totalCargosCard), summaryX + 6, currentY + 32);

  currentY += infoBoxHeight + 8;

  // Desglose de saldos pendientes
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.rect(marginX, currentY, contentWidth, 6, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const breakdownText = `Saldo inicial: $0.00 | Ordinarias: ${formatCurrency(ordinariasBalance)} | Extraordinarias: ${formatCurrency(extraordinariasCondominosBalance + extraordinariaComerciosBalance)} | Intereses: ${formatCurrency(interesesBalance)}`;
  doc.text(breakdownText, marginX + 3, currentY + 4.2);

  currentY += 10;

  // Sección de últimos pagos (idéntica a imprimir/page.tsx)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("ÚLTIMOS PAGOS REALIZADOS", marginX, currentY);
  currentY += 4;

  doc.setFillColor(240, 247, 255);
  doc.setDrawColor(200, 225, 250);
  doc.rect(marginX, currentY, contentWidth, 5.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 70, 90);
  doc.text("Folio", marginX + 3, currentY + 4);
  doc.text("Pagado el", marginX + 80, currentY + 4);
  doc.text("Abono realizado", marginX + contentWidth - 4, currentY + 4, { align: "right" });

  currentY += 5.5;

  if (chronologicalPayments.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("No hay pagos registrados", marginX + contentWidth / 2, currentY + 4, { align: "center" });
    currentY += 8;
  } else {
    chronologicalPayments.forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 252, 255);
        doc.rect(marginX, currentY, contentWidth, 5, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text(p.reference || p.paymentId.substring(0, 10), marginX + 3, currentY + 3.8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(formatDate(p.paidAt), marginX + 80, currentY + 3.8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(formatCurrency(p.paymentTotalAmount), marginX + contentWidth - 4, currentY + 3.8, { align: "right" });
      currentY += 5;
    });
    currentY += 3;
  }

  currentY += 4;

  // Detalle de cargos y movimientos (idéntico a imprimir/page.tsx)
  const colWidths = {
    tipo: 32,
    concepto: 40,
    cobro: 18,
    limite: 18,
    pagado: 18,
    cargo: 18,
    abono: 15,
    interes: 14,
    saldo: 15,
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(240, 247, 255);
    doc.setDrawColor(200, 225, 250);
    doc.rect(marginX, y, contentWidth, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(50, 70, 90);

    let x = marginX + 2;
    doc.text("Tipo de cuota", x, y + 4.2);
    x += colWidths.tipo;
    doc.text("Concepto", x, y + 4.2);
    x += colWidths.concepto;
    doc.text("Fecha de cobro", x, y + 4.2);
    x += colWidths.cobro;
    doc.text("Fecha límite de pago", x, y + 4.2);
    x += colWidths.limite;
    doc.text("Pagado el", x, y + 4.2);
    x += colWidths.pagado;
    doc.text("Cargo", x + colWidths.cargo - 2, y + 4.2, { align: "right" });
    x += colWidths.cargo;
    doc.text("Abono", x + colWidths.abono - 2, y + 4.2, { align: "right" });
    x += colWidths.abono;
    doc.text("Int. moratorios", x + colWidths.interes - 2, y + 4.2, { align: "right" });
    x += colWidths.interes;
    doc.text("Saldo", x + colWidths.saldo - 2, y + 4.2, { align: "right" });
  };

  drawTableHeader(currentY);
  currentY += 6;

  if (mappedCharges.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("No hay cargos registrados", marginX + contentWidth / 2, currentY + 4, { align: "center" });
    currentY += 10;
  } else {
    mappedCharges.forEach((c, idx) => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 15;
        drawTableHeader(currentY);
        currentY += 6;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(250, 252, 255);
        doc.rect(marginX, currentY, contentWidth, 5.2, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(40, 40, 40);

      let x = marginX + 2;
      doc.text((c.chargeGroupName || "").slice(0, 22), x, currentY + 3.8);
      x += colWidths.tipo;
      doc.text((c.concept || `${c.chargeGroupName} ${c.periodYear}`).slice(0, 28), x, currentY + 3.8);
      x += colWidths.concepto;
      doc.text(`01 ${formatPeriodMonth(c.periodMonth)} ${c.periodYear.toString().slice(-2)}`, x, currentY + 3.8);
      x += colWidths.cobro;
      doc.text(c.dueDate ? formatDate(c.dueDate) : "—", x, currentY + 3.8);
      x += colWidths.limite;
      const paidDates = c.paidDatesList && c.paidDatesList.length > 0 ? c.paidDatesList.join(" / ") : "—";
      doc.text(paidDates, x, currentY + 3.8);
      x += colWidths.pagado;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(formatCurrency(c.amount), x + colWidths.cargo - 2, currentY + 3.8, { align: "right" });
      x += colWidths.cargo;
      doc.setFont("helvetica", "normal");
      doc.text(formatCurrency(c.paidAmount), x + colWidths.abono - 2, currentY + 3.8, { align: "right" });
      x += colWidths.abono;

      doc.text(formatCurrency(c.interestAmount), x + colWidths.interes - 2, currentY + 3.8, { align: "right" });
      x += colWidths.interes;

      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(c.balanceAmount), x + colWidths.saldo - 2, currentY + 3.8, { align: "right" });

      currentY += 5.2;
    });

    // Fila resumen de totales
    if (currentY > 260) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFillColor(240, 245, 255);
    doc.rect(marginX, currentY, contentWidth, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(20, 30, 45);

    let x = marginX + 2;
    doc.text("TOTALES", x, currentY + 4.2);
    x += colWidths.tipo + colWidths.concepto + colWidths.cobro + colWidths.limite + colWidths.pagado;

    const totalCargosSum = mappedCharges.reduce((acc, c) => acc + c.amount, 0);
    const totalAbonosSum = mappedCharges.reduce((acc, c) => acc + c.paidAmount, 0);
    const totalIntSum = mappedCharges.reduce((acc, c) => acc + c.interestAmount, 0);
    const totalSaldoSum = mappedCharges.reduce((acc, c) => acc + c.balanceAmount, 0);

    doc.text(formatCurrency(totalCargosSum), x + colWidths.cargo - 2, currentY + 4.2, { align: "right" });
    x += colWidths.cargo;
    doc.text(formatCurrency(totalAbonosSum), x + colWidths.abono - 2, currentY + 4.2, { align: "right" });
    x += colWidths.abono;
    doc.text(formatCurrency(totalIntSum), x + colWidths.interes - 2, currentY + 4.2, { align: "right" });
    x += colWidths.interes;
    doc.text(formatCurrency(totalSaldoSum), x + colWidths.saldo - 2, currentY + 4.2, { align: "right" });

    currentY += 10;
  }

  // Numeración de páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Pág. ${i}`,
      pageWidth - marginX - 10,
      currentY > 265 ? 275 : 14,
      { align: "right" }
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);
  const safeAreaName = area.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Estado_de_cuenta_${safeAreaName}.pdf`;

  return { buffer, filename };
}
