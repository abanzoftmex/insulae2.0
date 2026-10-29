/**
 * PDF del estado de cuenta de un arrendamiento (jsPDF, A4 vertical). Réplica del minisitio:
 * la descarga y el adjunto del correo son el mismo documento (solo cambia la salida).
 */
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import type { RentalAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import {
  formatCurrency,
  loadProjectLogoImage,
  movementBalance,
  toAmount,
} from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import {
  createStatementDoc,
  drawMovementsHeader,
  drawPageFooters,
  drawSummaryColumns,
  drawSummaryPanels,
  splitText,
  type JsPDF,
  type SummaryItem,
} from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-pdf";

/** Pies de página que el minisitio leía del proyecto. getProjectInfo() no los trae: se usa el texto por defecto. */
type ProjectFooterText = { pie_izquierda?: string | null; pie_derecha?: string | null };

export interface RentalStatementPdfInput {
  arrendamiento: RentalAccountStatement["arrendamiento"];
  estadoCuenta: RentalAccountStatement["estadoCuenta"];
  proyecto: (ProjectInfo & ProjectFooterText) | null;
}

const fmtMoney = formatCurrency;
// A diferencia de la pantalla, el PDF del arrendamiento formatea con `new Date(fecha)` (hora local).
const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("es-MX") : "N/A");

export async function buildRentalStatementPdf({
  arrendamiento,
  estadoCuenta,
  proyecto,
}: RentalStatementPdfInput): Promise<JsPDF> {
  const { doc, layout } = await createStatementDoc();
  const { pageWidth, pageHeight, margin, contentWidth } = layout;
  const reservedBankHeight = 60;
  const bottomSafe = 10;
  const pageBottomLimit = pageHeight - margin - bottomSafe;

  let currentY = margin + 5;
  // Header: título y logo
  const leftColWidth = contentWidth * 0.6;
  const rightColWidth = contentWidth - leftColWidth;
  const leftX = margin;
  const rightX = margin + leftColWidth;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Estado de cuenta", leftX, currentY + 6);

  // Logo
  let logoBottom = currentY;
  try {
    const img = await loadProjectLogoImage(proyecto?.logo);
    const maxW = Math.min(rightColWidth - 10, 50);
    const maxH = 18;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const drawW = Math.max(1, img.width * scale);
    const drawH = Math.max(1, img.height * scale);
    const logoY = currentY;
    const logoX = rightX + (rightColWidth - drawW) / 2;
    doc.addImage(img, "PNG", logoX, logoY, drawW, drawH);
    logoBottom = logoY + drawH;
  } catch {
    const placeholderY = currentY;
    const phW = Math.min(rightColWidth - 10, 50);
    const phH = 15;
    doc.setDrawColor(150, 150, 150);
    doc.rect(rightX + (rightColWidth - phW) / 2, placeholderY, phW, phH);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const logoText = proyecto && proyecto.nombre ? proyecto.nombre : "Logo";
    doc.text(logoText, rightX + (rightColWidth - phW) / 2 + 3, placeholderY + phH / 2);
    logoBottom = placeholderY + phH;
  }

  currentY = Math.max(currentY + 10, logoBottom) + 5;

  // Tabla de información del arrendamiento
  const boxY = currentY;
  const rowH = 7;
  const rowsData: SummaryItem[] = [
    ["Comercio:", arrendamiento.nombre_comercio || "N/A"],
    ["Área:", arrendamiento.area_nombre || "N/A"],
    ["RFC:", arrendamiento.rfc || "N/A"],
    ["Email:", arrendamiento.email || "N/A"],
    ["Teléfono:", arrendamiento.telefono || "N/A"],
  ];
  const boxH = rowH * rowsData.length;

  // Dibujar borde de la tabla
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(leftX, boxY, leftColWidth, boxH);

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  let rowY = boxY + 5;
  rowsData.forEach(([label, value], i) => {
    const pad = 3;
    doc.setFont("helvetica", "normal");
    doc.text(label, leftX + pad, rowY);

    const valW = doc.getTextWidth(String(value));
    const rightEdge = leftX + leftColWidth - pad;
    const valueX = rightEdge - valW;
    doc.setFont("helvetica", "bold");
    doc.text(String(value), valueX, rowY);

    // Línea divisoria entre filas (excepto la última)
    if (i < rowsData.length - 1) {
      doc.setLineWidth(0.2);
      doc.line(leftX, rowY + 2.5, leftX + leftColWidth, rowY + 2.5);
    }
    rowY += rowH;
  });

  currentY = boxY + boxH + 10;

  // Paneles resumen: DEBE AL DÍA = saldoPendiente y CARGOS TOTALES = cargosTotales (como la pantalla)
  currentY = drawSummaryPanels(doc, layout, currentY, pageBottomLimit, {
    debe: fmtMoney(estadoCuenta.saldoPendiente || 0),
    favor: fmtMoney(0),
    cargos: fmtMoney(estadoCuenta.cargosTotales || 0),
  });

  // Sumas columna doble
  const movs = Array.isArray(estadoCuenta.movimientos) ? estadoCuenta.movimientos : [];
  let sumIntereses = 0;
  movs.forEach((m) => {
    sumIntereses += toAmount(m.intereses);
  });
  // El minisitio nunca acumulaba los descuentos de este resumen: siempre muestra $0.00.
  const sumDescuentos = 0;
  // Cálculos por grupo de cobro (claves legacy 1=ordinarias, 2=extraordinarias, 3=STC,
  // 5=sanciones, 6=comercios, 7=comodato).
  const gruposCalcs = estadoCuenta.gruposCalculos || { debeAlDia: {}, cargosTotales: {} };

  const itemsLeft: SummaryItem[] = [
    ["Saldo inicial:", fmtMoney(0)],
    ["Cuotas ordinarias:", fmtMoney(gruposCalcs.debeAlDia[1] || 0)],
    ["Cuotas extraordinarias:", fmtMoney(gruposCalcs.debeAlDia[2] || 0)],
    ["Cuotas STC:", fmtMoney(gruposCalcs.debeAlDia[3] || 0)],
    ["Sanción:", fmtMoney(gruposCalcs.debeAlDia[5] || 0)],
    ["Cuota extraordinaria comercios:", fmtMoney(gruposCalcs.debeAlDia[6] || 0)],
    ["Comodato:", fmtMoney(gruposCalcs.debeAlDia[7] || 0)],
    ["Intereses moratorios:", fmtMoney(sumIntereses)],
  ];
  const itemsRight: SummaryItem[] = [
    ["Saldo inicial:", fmtMoney(0)],
    ["Cuotas ordinarias:", fmtMoney(gruposCalcs.cargosTotales[1] || 0)],
    ["Cuotas extraordinarias:", fmtMoney(gruposCalcs.cargosTotales[2] || 0)],
    ["Cuotas STC:", fmtMoney(gruposCalcs.cargosTotales[3] || 0)],
    ["Sanción:", fmtMoney(gruposCalcs.cargosTotales[5] || 0)],
    ["Cuota extraordinaria comercios:", fmtMoney(gruposCalcs.cargosTotales[6] || 0)],
    ["Comodato:", fmtMoney(gruposCalcs.cargosTotales[7] || 0)],
    ["Intereses moratorios:", fmtMoney(sumIntereses)],
    ["Descuentos:", fmtMoney(sumDescuentos)],
  ];
  currentY = drawSummaryColumns(doc, layout, currentY, pageBottomLimit, itemsLeft, itemsRight);

  // Últimos pagos realizados
  const pagosRealizados = (estadoCuenta.pagos || []).filter((p) => p.status === "pagado").slice(0, 3);
  if (pagosRealizados.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("ÚLTIMOS PAGOS REALIZADOS", margin, currentY);
    currentY += 8;
    const colPerc3 = [0.3, 0.35, 0.35];
    const colW3 = [Math.floor(contentWidth * colPerc3[0]), Math.floor(contentWidth * colPerc3[1])];
    colW3.push(contentWidth - (colW3[0] + colW3[1]));
    if (currentY + 12 > pageBottomLimit) {
      doc.addPage();
      currentY = margin + 5;
    }
    const hdrH3 = 10;
    const drawPaymentsHeader = () => {
      doc.rect(margin, currentY - 3, contentWidth, hdrH3, "F");
      let hx = margin + 3;
      doc.text("Folio", hx, currentY + 3.5);
      hx += colW3[0];
      doc.text("Fecha Real de", hx, currentY + 1.5);
      doc.text("Cobro", hx, currentY + 5.5);
      hx += colW3[1];
      doc.text("Abono", hx, currentY + 1.5);
      doc.text("Realizado", hx, currentY + 5.5);
    };
    doc.setFillColor(31, 41, 55);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    drawPaymentsHeader();
    const rowH3 = 7;
    currentY += hdrH3;
    for (const p of pagosRealizados) {
      if (currentY + rowH3 + 5 > pageBottomLimit) {
        doc.addPage();
        currentY = margin + 5;
        doc.setFillColor(31, 41, 55);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        drawPaymentsHeader();
        currentY += hdrH3;
      }
      doc.setTextColor(0, 0, 0);
      let cx = margin + 3;
      doc.text(String(p.folio || "N/A"), cx, currentY + 5);
      cx += colW3[0];
      doc.text(fmtDate(p.fecha), cx, currentY + 5);
      cx += colW3[1];
      doc.text(fmtMoney(p.monto), cx, currentY + 5);
      currentY += rowH3;
    }
    currentY += 12;
  }

  // Detalle de estado de cuenta (10 columnas)
  // Anchos dinámicos que siempre suman contentWidth (para evitar desbordes)
  const ratios = [0.12, 0.2, 0.1, 0.1, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08];
  const widths: number[] = [];
  let acc = 0;
  for (let i = 0; i < ratios.length; i++) {
    // Ajuste final para cuadrar exactamente
    const w = i < ratios.length - 1 ? Math.floor(contentWidth * ratios[i]) : contentWidth - acc;
    widths.push(w);
    acc += w;
  }
  if (currentY + 20 > pageBottomLimit) {
    doc.addPage();
    currentY = margin + 5;
  }
  currentY = drawMovementsHeader(doc, layout, currentY, widths);
  // Tras el encabezado con fondo oscuro, texto de filas en color visible
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const m of movs) {
    const lineH2 = 3.8,
      padX2 = 1.5,
      padY2 = 1.5;
    const saldoCalc = movementBalance(m);
    const vals = [
      m.grupoCobro || "Arrendamiento",
      m.concepto || "Sin concepto",
      fmtDate(m.fechaPago),
      fmtDate(m.fechaVigencia),
      fmtDate(m.fechaLiquidacion),
      fmtMoney(m.monto),
      fmtMoney(m.montoAbonado),
      fmtMoney(m.intereses),
      fmtMoney(m.descuento_aplicado || 0),
      fmtMoney(saldoCalc > 0 ? saldoCalc : 0),
    ];
    const cells = vals.map((v, idx) => splitText(doc, String(v), widths[idx] - 2 * padX2));
    const maxLines = Math.max(...cells.map((a) => a.length));
    const rowH2Dyn = maxLines * lineH2 + 2 * padY2;
    if (currentY + rowH2Dyn + 5 > pageBottomLimit) {
      doc.addPage();
      currentY = margin + 5;
      currentY = drawMovementsHeader(doc, layout, currentY, widths);
      // Volvemos a texto oscuro para las filas tras un salto de página
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
    doc.setLineWidth(0.05);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    let cx = margin + padX2;
    cells.forEach((lines, idx) => {
      for (let li = 0; li < lines.length; li++) {
        doc.text(lines[li], cx, currentY + padY2 + lineH2 + li * lineH2);
      }
      cx += widths[idx];
    });
    doc.setLineWidth(0.05);
    doc.line(margin, currentY + rowH2Dyn, pageWidth - margin, currentY + rowH2Dyn);
    currentY += rowH2Dyn;
  }

  // Información de pagos y bancaria - anclada al fondo
  const bankSectionHeight = reservedBankHeight;
  const bankTopY = pageHeight - margin - bankSectionHeight;
  if (currentY > bankTopY - 10) {
    doc.addPage();
    currentY = margin + 5;
  }
  doc.setPage(doc.internal.pages.length - 1);
  const bankingSectionY = bankTopY + 3;

  // Columnas
  const leftColumnX = margin;
  const leftColumnWidth = contentWidth * 0.55;
  const rightColumnX = margin + leftColumnWidth + 5;

  // Columna izquierda: Caja con condiciones de pago
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  const boxHeight = 55;
  doc.roundedRect(leftColumnX, bankingSectionY, leftColumnWidth, boxHeight, 2, 2, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(0, 0, 0);

  let leftY = bankingSectionY + 5;
  const leftPad = leftColumnX + 3;
  const lineSpacing = 3;

  if (proyecto && proyecto.pie_izquierda) {
    // Usar información del proyecto si está disponible
    proyecto.pie_izquierda.split("\n").forEach((line) => {
      if (line.trim() && leftY < bankingSectionY + boxHeight - 2) {
        splitText(doc, line.trim(), leftColumnWidth - 6).forEach((wrappedLine) => {
          if (leftY < bankingSectionY + boxHeight - 2) {
            doc.text(wrappedLine, leftPad, leftY);
            leftY += lineSpacing;
          }
        });
      }
    });
  } else {
    // Texto por defecto
    doc.text("Estimado Condominio o residente que:", leftPad, leftY);
    leftY += lineSpacing + 1;

    const conditions = [
      "1. La fecha de pago de la cuota ordinaria concierne a los primeros 7 días hábiles del mes, y a partir del día 8",
      "   genera interés moratorio por el artículo 53 fracción II del reglamento general de condóminos artículo 53 Jul-2025.",
      "2. No se aceptan duplicados en efectivo en cuenta bancaria.",
      "3. Los comprobantes de pago deben ser identificados mediante el concepto VQP (Número de propiedad),",
      "   ejemplo: VQP01, Cuota Ordinaria, Cuota Extraordinaria, Cuota STC, Sanción, Cuota Jul-2025.",
      "4. Pagos identificados no se reflejarán permanentemente.",
    ];
    conditions.forEach((condition) => {
      if (leftY < bankingSectionY + boxHeight - 2) {
        doc.text(condition, leftPad, leftY);
        leftY += lineSpacing;
      }
    });
  }

  // Columna derecha: Información bancaria
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  let rightY = bankingSectionY + 3;

  if (proyecto && proyecto.pie_derecha) {
    // Usar información del proyecto si está disponible
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    proyecto.pie_derecha.split("\n").forEach((line) => {
      if (line.trim() && rightY < bankingSectionY + 55) {
        doc.text(line.trim(), rightColumnX, rightY);
        rightY += 3.5;
      }
    });
  } else {
    // Información bancaria por defecto
    doc.text("INFORMACIÓN BANCARIA", rightColumnX, rightY);
    rightY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);

    const bankInfo = [
      "Banco INB/IRSA",
      "Cuenta: 036640020595918048",
      "",
      "BANCO DEL BAJÍO",
      "Clabe Interbancaria: 030180036640020595383",
    ];
    bankInfo.forEach((line) => {
      doc.text(line, rightColumnX, rightY);
      rightY += line === "" ? 2 : 3.5;
    });
  }

  // Texto de validez fiscal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text("Este comprobante no tiene validez fiscal.", rightColumnX, bankingSectionY + boxHeight + 5);

  drawPageFooters(doc, layout);
  return doc;
}
