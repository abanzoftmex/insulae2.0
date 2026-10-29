/**
 * PDF del estado de cuenta de una propiedad (jsPDF, A4 vertical). Réplica del minisitio, que
 * tenía dos variantes casi gemelas:
 *  - "download": botón "Descargar Estado de Cuenta".
 *  - "email": el PDF que se adjunta al correo.
 * Comparten encabezado, caja de datos, logo, paneles y resumen por tipo de cuota; difieren en
 * el encabezado de "Últimos pagos", en las filas de movimientos (con o sin salto de línea) y
 * en el bloque "Información de pagos" del pie.
 */
import type { MinisitioUser } from "@/modules/minisitio/domain/types";
import type { PropertyAccountStatement } from "@/modules/minisitio/infrastructure/queries/account-statement.queries";
import {
  formatCurrency,
  formatDate,
  loadProjectLogoImage,
  movementBalance,
  sancionArticulo,
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
  type StatementPdfLayout,
  type SummaryItem,
} from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-pdf";

/** Pies de página que el minisitio leía del proyecto. La consulta actual no los trae: se usa el texto por defecto. */
type ProjectFooterText = { pie_izquierda?: string | null; pie_derecha?: string | null };

export type PropertyStatementPdfVariant = "download" | "email";

export interface PropertyStatementPdfInput {
  propiedad: PropertyAccountStatement["propiedad"];
  estadoCuenta: PropertyAccountStatement["estadoCuenta"];
  proyecto: PropertyAccountStatement["proyecto"] & ProjectFooterText;
  user: MinisitioUser | null;
}

export async function buildPropertyStatementPdf(
  { propiedad, estadoCuenta, proyecto, user }: PropertyStatementPdfInput,
  variant: PropertyStatementPdfVariant,
): Promise<JsPDF> {
  const { doc, layout } = await createStatementDoc();
  const { pageHeight, margin, contentWidth } = layout;
  // Reservar espacio inferior para evitar solapamiento con 'INFORMACIÓN DE PAGOS'
  const reservedBankHeight = 60; // altura fija del bloque bancario
  const bottomSafe = 10; // holgura
  const pageBottomLimit = pageHeight - margin - reservedBankHeight - bottomSafe;

  let currentY = margin + 5;

  // Sección superior: 2 columnas (izquierda: título + info, derecha: logo)
  const leftColWidth = contentWidth * 0.5;
  const rightColWidth = contentWidth - leftColWidth;
  const leftX = margin;
  const rightX = margin + leftColWidth;

  // H1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 55);
  doc.text("Estado de cuenta", leftX, currentY + 8);

  // Caja de información con borde negro (5 filas)
  const boxY = currentY + 12;
  const rowH = 8;
  const areaPriv = propiedad.nombre || propiedad.iniciales || "N/A";
  const m2Text = `${(propiedad.m2_totales || 0).toLocaleString()} m²`;
  const fullName = [user?.nombre, user?.apaterno, user?.amaterno].filter(Boolean).join(" ") || "N/A";
  const emailText = user?.email || "N/A";
  const phoneText = user?.telefono || "N/A";
  const rowsData: SummaryItem[] = [
    ["Area privativa:", areaPriv],
    ["M2:", m2Text],
    ["Nombre:", fullName],
    ["Email:", emailText],
    ["Teléfono:", phoneText],
  ];
  const boxH = rowH * rowsData.length + 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  // Borde con esquinas redondeadas
  doc.roundedRect(leftX, boxY, leftColWidth - 5, boxH, 3, 3, "S");

  // Filas dentro de la caja (valores en negritas)
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  let rowY = boxY + 7;
  rowsData.forEach(([label, value], i) => {
    // Etiqueta a la izquierda
    doc.setFont("helvetica", "normal");
    const pad = 4;
    doc.text(label, leftX + pad, rowY);
    // Valor en negritas alineado a la derecha del contenedor (justify-between)
    const valW = doc.getTextWidth(String(value));
    const rightEdge = leftX + (leftColWidth - 5) - pad;
    const valueX = rightEdge - valW;
    doc.setFont("helvetica", "bold");
    doc.text(String(value), valueX, rowY);
    // Separador de fila
    if (i < rowsData.length - 1) {
      doc.setLineWidth(0.2);
      doc.line(leftX, rowY + 3, leftX + leftColWidth - 5, rowY + 3);
    }
    rowY += rowH;
  });

  // Logo en la columna derecha
  let logoBottom = currentY; // fallback
  try {
    const img = await loadProjectLogoImage(proyecto.logo);
    const maxW = Math.min(rightColWidth - 10, 60);
    const maxH = 20; // altura máxima para mantener proporción
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const drawW = Math.max(1, img.width * scale);
    const drawH = Math.max(1, img.height * scale);
    const logoY = currentY + 2;
    const logoX = rightX + (rightColWidth - drawW) / 2;
    doc.addImage(img, "PNG", logoX, logoY, drawW, drawH);
    logoBottom = logoY + drawH;
  } catch {
    // Si no carga el logo, dibujar un placeholder
    const placeholderY = currentY + 2;
    const phW = Math.min(rightColWidth - 10, 60);
    const phH = 18;
    doc.setDrawColor(150, 150, 150);
    doc.rect(rightX + (rightColWidth - phW) / 2, placeholderY, phW, phH);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Logo", rightX + (rightColWidth - phW) / 2 + 3, placeholderY + phH / 2);
    logoBottom = placeholderY + phH;
  }

  // Avanzar la posición actual debajo del bloque más bajo
  currentY = Math.max(boxY + boxH, logoBottom) + 10;

  // Paneles de resumen (izquierda: DEBE AL DÍA / SALDO A FAVOR, derecha: CARGOS TOTALES)
  currentY = drawSummaryPanels(doc, layout, currentY, pageBottomLimit, {
    debe: formatCurrency(estadoCuenta.saldoPendiente || 0),
    favor: formatCurrency(estadoCuenta.saldoAFavor || 0),
    cargos: formatCurrency(estadoCuenta.cargosTotales || 0),
  });

  // 2 columnas 50/50 con los montos por tipo de cuota (a partir de los movimientos)
  const { itemsLeft, itemsRight } = summarizeByGroup(estadoCuenta.movimientos);
  currentY = drawSummaryColumns(doc, layout, currentY, pageBottomLimit, itemsLeft, itemsRight);

  // Sección: ÚLTIMOS PAGOS REALIZADOS (3 columnas)
  const pagos = estadoCuenta.historialPagos;
  if (pagos.length > 0) {
    currentY = drawLatestPayments(doc, layout, currentY, pageBottomLimit, pagos, variant);
    // Espaciado extra entre tablas (Pagos ↔ Movimientos)
    currentY += 12;
  }

  // Tabla de movimientos con 10 columnas
  if (estadoCuenta.movimientos.length > 0) {
    currentY = drawMovements(doc, layout, currentY, pageBottomLimit, estadoCuenta.movimientos, variant);
  }

  // Información bancaria - SIEMPRE anclada al fondo de la ÚLTIMA página
  const bankSectionHeight = 60; // altura visual del bloque
  const bankTopY = pageHeight - margin - bankSectionHeight; // top del bloque anclado
  if (currentY > bankTopY - 10) {
    // 10mm de holgura
    doc.addPage();
    currentY = margin + 5;
  }

  // Asegurar que dibujamos en la última página
  doc.setPage(doc.internal.pages.length - 1);

  // Fondo gris para la sección bancaria (anclado al fondo)
  const bankingSectionY = bankTopY + 5; // punto base para textos
  doc.setFillColor(249, 250, 251); // Gris muy claro
  doc.rect(margin, bankTopY, contentWidth, bankSectionHeight, "F");

  // Título de la sección
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text("INFORMACIÓN DE PAGOS", margin + 5, bankingSectionY);

  if (variant === "download") {
    drawDownloadPaymentInfo(doc, layout, bankingSectionY, proyecto);
  } else {
    drawEmailPaymentInfo(doc, layout, bankingSectionY);
  }

  // PIE DE PÁGINA (debajo del bloque anclado)
  drawPageFooters(doc, layout);

  return doc;
}

type Movimiento = PropertyAccountStatement["estadoCuenta"]["movimientos"][number];
type Pago = PropertyAccountStatement["estadoCuenta"]["historialPagos"][number];

/**
 * DEBE AL DÍA (izquierda: vencidos y no pagados) y CARGOS TOTALES (derecha: todos), por tipo
 * de cuota. Basado en el PHP original: vencido = fechaPago <= hoy e id_cat_status_pago != 2;
 * sanciones = id_cat_grupos_cobro == 5; el resto se clasifica por el nombre del grupo.
 */
function summarizeByGroup(movs: Movimiento[]): { itemsLeft: SummaryItem[]; itemsRight: SummaryItem[] } {
  let debeOrd = 0,
    debeExt = 0,
    debeSTC = 0,
    debeComer = 0,
    debeComod = 0,
    debeSanc = 0;
  let debeIntereses = 0;

  let cargoOrd = 0,
    cargoExt = 0,
    cargoSTC = 0,
    cargoComer = 0,
    cargoComod = 0,
    cargoSanc = 0;
  let cargoIntereses = 0,
    cargoDescuentos = 0;

  const today = new Date().toISOString().split("T")[0]; // formato YYYY-MM-DD

  movs.forEach((m) => {
    const group = ((m.grupoCobro || m.concepto || "") + "").toLowerCase();
    const isPaid = Number(m.id_cat_status_pago) === 2;
    const monto = toAmount(m.monto);
    const intereses = toAmount(m.intereses);
    const descuento = toAmount(m.descuento_aplicado);
    const isSancion = Number(m.id_cat_grupos_cobro) === 5;
    const fechaPago = m.fechaPago || "";

    // Para fecha vencida y no pagado (DEBE AL DÍA)
    const isVencido = fechaPago <= today && !isPaid;

    if (isSancion) {
      cargoSanc += monto;
      if (isVencido) debeSanc += monto - descuento;
    } else if (group.includes("comodato")) {
      cargoComod += monto;
      if (isVencido) debeComod += monto - descuento; // PHP usa solo monto - descuento para grupos individuales
    } else if (group.includes("comerc")) {
      cargoComer += monto;
      if (isVencido) debeComer += monto - descuento;
    } else if (group.includes("stc")) {
      cargoSTC += monto;
      if (isVencido) debeSTC += monto - descuento;
    } else if (group.includes("extra")) {
      cargoExt += monto;
      if (isVencido) debeExt += monto - descuento;
    } else {
      // por defecto, ordinarias
      cargoOrd += monto;
      if (isVencido) debeOrd += monto - descuento;
    }

    // Totales - para intereses solo se agregan al total general
    cargoIntereses += intereses;
    cargoDescuentos += descuento;
    if (isVencido) {
      debeIntereses += intereses;
    }
  });

  return {
    itemsLeft: [
      ["Saldo inicial:", formatCurrency(0)],
      ["Cuotas ordinarias:", formatCurrency(debeOrd)],
      ["Cuotas extraordinarias:", formatCurrency(debeExt)],
      ["Cuotas STC:", formatCurrency(debeSTC)],
      ["Sanción:", formatCurrency(debeSanc)],
      ["Cuota extraordinaria comercios:", formatCurrency(debeComer)],
      ["Comodato:", formatCurrency(debeComod)],
      ["Intereses moratorios:", formatCurrency(debeIntereses)],
    ],
    itemsRight: [
      ["Saldo inicial:", formatCurrency(0)],
      ["Cuotas ordinarias:", formatCurrency(cargoOrd)],
      ["Cuotas extraordinarias:", formatCurrency(cargoExt)],
      ["Cuotas STC:", formatCurrency(cargoSTC)],
      ["Sanción:", formatCurrency(cargoSanc)],
      ["Cuota extraordinaria comercios:", formatCurrency(cargoComer)],
      ["Comodato:", formatCurrency(cargoComod)],
      ["Intereses moratorios:", formatCurrency(cargoIntereses)],
      ["Descuentos:", formatCurrency(cargoDescuentos)],
    ],
  };
}

/** "ÚLTIMOS PAGOS REALIZADOS": Folio | Fecha real de cobro | Abono realizado. */
function drawLatestPayments(
  doc: JsPDF,
  { pageWidth, pageHeight, margin, contentWidth }: StatementPdfLayout,
  startY: number,
  pageBottomLimit: number,
  pagos: Pago[],
  variant: PropertyStatementPdfVariant,
): number {
  let currentY = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text("ÚLTIMOS PAGOS REALIZADOS", margin, currentY);
  currentY += 8;

  const colPerc3 = [0.3, 0.35, 0.35];
  const colW3 = [Math.floor(contentWidth * colPerc3[0]), Math.floor(contentWidth * colPerc3[1])];
  colW3.push(contentWidth - (colW3[0] + colW3[1]));

  // Calcular espacio necesario para la tabla completa (el encabezado de la descarga es más alto)
  const headerHeight = variant === "download" ? 10 : 8;
  const rowHeight = 6;
  const totalRowsHeight = pagos.length * rowHeight;
  const totalTableHeight = headerHeight + totalRowsHeight + 5; // +5 margen

  // Para tablas pequeñas (3 pagos o menos), usar límite más permisivo
  const effectiveLimit = pagos.length <= 3 ? pageHeight - margin - 30 : pageBottomLimit;

  // Solo hacer salto de página si realmente no cabe toda la tabla
  if (currentY + totalTableHeight > effectiveLimit) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFillColor(31, 41, 55);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  if (variant === "download") {
    // Header con fondo (multi-línea)
    const hdrH3 = 10;
    doc.rect(margin, currentY - 3, contentWidth, hdrH3, "F");

    let hx = margin + 3;
    doc.text("Folio", hx, currentY + 3.5);
    hx += colW3[0];
    doc.text("Fecha Real de", hx, currentY + 1.5);
    doc.text("Cobro", hx, currentY + 5.5);
    hx += colW3[1];
    doc.text("Abono", hx, currentY + 1.5);
    doc.text("Realizado", hx, currentY + 5.5);

    // Línea inferior del header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    const hdrBottom3 = currentY - 3 + hdrH3;
    doc.line(margin, hdrBottom3, pageWidth - margin, hdrBottom3);
    currentY += hdrH3;
  } else {
    // Header de una línea (PDF del correo)
    doc.rect(margin, currentY - 3, contentWidth, 8, "F");
    let hx = margin + 3;
    doc.text("Folio", hx, currentY + 2);
    hx += colW3[0];
    doc.text("Fecha Real de Cobro", hx, currentY + 2);
    hx += colW3[1];
    doc.text("Abono Realizado", hx, currentY + 2);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 5, pageWidth - margin, currentY + 5);
    currentY += 8;
  }

  // Filas (ya se verificó que toda la tabla cabe)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const rowH = 6;
  for (const p of pagos) {
    // Línea superior de fila
    doc.setLineWidth(0.05);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    let cx = margin + 3;
    doc.text(String(p.folio || "N/A"), cx, currentY + 4);
    cx += colW3[0];
    doc.text(formatDate(p.fechaPago), cx, currentY + 4);
    cx += colW3[1];
    doc.text(formatCurrency(p.monto), cx, currentY + 4);

    // Línea inferior de fila
    doc.setLineWidth(0.05);
    doc.line(margin, currentY + rowH, pageWidth - margin, currentY + rowH);
    currentY += rowH;
  }
  return currentY;
}

/** Tabla de movimientos (10 columnas). La descarga parte el texto por celda; el correo usa una línea por fila. */
function drawMovements(
  doc: JsPDF,
  layout: StatementPdfLayout,
  startY: number,
  pageBottomLimit: number,
  movs: Movimiento[],
  variant: PropertyStatementPdfVariant,
): number {
  const { pageWidth, margin, contentWidth } = layout;
  let currentY = startY;

  // Anchos proporcionales; el sobrante se reparte columna por columna
  const perc = [0.1, 0.1, 0.08, 0.07, 0.06, 0.07, 0.08, 0.08, 0.07, 0.07];
  const widths = perc.map((p) => Math.floor(contentWidth * p));
  let rem = contentWidth - widths.reduce((a, b) => a + b, 0);
  let i = 0;
  while (rem > 0) {
    widths[i % widths.length]++;
    rem--;
    i++;
  }

  // Salto si no cabe el header
  if (currentY + 12 > pageBottomLimit) {
    doc.addPage();
    currentY = margin + 5;
  }
  currentY = drawMovementsHeader(doc, layout, currentY, widths);

  // Filas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  for (const m of movs) {
    const tipo = m.grupoCobro || "N/A";
    // Agregar artículo al concepto si es una sanción
    let concepto = m.concepto || "Sin concepto";
    const articulo = sancionArticulo(m);
    if (articulo) {
      concepto = `${concepto} (${articulo})`;
    }
    const fCobro = formatDate(m.fechaPago);
    const fLimite = m.fechaVigencia ? formatDate(m.fechaVigencia) : "N/A";
    const fPago = m.fechaLiquidacion ? formatDate(m.fechaLiquidacion) : "N/A";
    const vals = [
      tipo,
      concepto,
      fCobro,
      fLimite,
      fPago,
      formatCurrency(m.monto),
      formatCurrency(m.montoAbonado),
      formatCurrency(m.intereses),
      formatCurrency(m.descuento_aplicado),
      formatCurrency(movementBalance(m)),
    ];

    if (variant === "download") {
      // Celdas con salto de línea y alto de fila dinámico
      const lineH2 = 3.8;
      const padX2 = 1.5;
      const padY2 = 1.5;
      const cells = vals.map((v, idx) => splitText(doc, String(v), widths[idx] - 2 * padX2));
      const maxLines = Math.max(...cells.map((a) => a.length));
      const rowH2Dyn = maxLines * lineH2 + 2 * padY2;

      if (currentY + rowH2Dyn + 5 > pageBottomLimit) {
        // Nueva página + reimprimir header
        doc.addPage();
        currentY = margin + 5;
        currentY = drawMovementsHeader(doc, layout, currentY, widths);
        // Restablecer color y fuente para filas tras salto de página
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(31, 41, 55);
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
    } else {
      // PDF del correo: una línea por fila
      const rowH2 = 6;
      if (currentY + rowH2 + 5 > pageBottomLimit) {
        doc.addPage();
        currentY = margin + 5;
        currentY = drawMovementsHeader(doc, layout, currentY, widths);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
      }

      doc.setLineWidth(0.05);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      let cx = margin + 2;
      vals.forEach((cell, idx) => {
        doc.text(String(cell), cx, currentY + 4);
        cx += widths[idx];
      });

      doc.setLineWidth(0.05);
      doc.line(margin, currentY + rowH2, pageWidth - margin, currentY + rowH2);
      currentY += rowH2;
    }
  }
  return currentY;
}

/** Pie de la descarga: textos del proyecto (pie_izquierda / pie_derecha) o sus respaldos. */
function drawDownloadPaymentInfo(
  doc: JsPDF,
  { margin, contentWidth }: StatementPdfLayout,
  bankingSectionY: number,
  proyecto: ProjectFooterText,
): void {
  const leftColumnX = margin + 5;
  const rightColumnX = margin + contentWidth / 2 + 10;

  // El ancho total se divide en dos columnas con un pequeño margen entre ellas
  const columnSpacing = 20; // Espacio entre columnas
  const leftColumnWidth = contentWidth / 2 - columnSpacing / 2 - 5;
  const rightColumnWidth = contentWidth / 2 - columnSpacing / 2 - 5;

  // Divide texto largo en líneas (mide con helvetica normal del tamaño indicado)
  const splitTextIntoLines = (text: string, maxWidth: number, fontSize = 6): string[] => {
    if (!text || !text.trim()) {
      return [];
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = doc.getTextWidth(testLine);
      if (textWidth > maxWidth && currentLine) {
        // La línea actual + nueva palabra es demasiado larga
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [text];
  };

  // COLUMNA IZQUIERDA - Información del proyecto (pie_izquierda)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(17, 24, 39);

  if (proyecto.pie_izquierda) {
    let leftY = bankingSectionY + 6;
    proyecto.pie_izquierda.split("\n").forEach((line) => {
      if (line.trim()) {
        splitTextIntoLines(line.trim(), leftColumnWidth, 6).forEach((wrappedLine) => {
          doc.text(wrappedLine, leftColumnX, leftY);
          leftY += 2.5; // Espacio reducido entre líneas
        });
      } else {
        // Línea vacía - agregar espacio reducido
        leftY += 1.5;
      }
    });
  } else {
    // Fallback si no hay información
    let leftY = bankingSectionY + 6;
    splitTextIntoLines("Información bancaria no disponible", leftColumnWidth, 6).forEach((line) => {
      doc.text(line, leftColumnX, leftY);
      leftY += 2.5;
    });
  }

  // COLUMNA DERECHA - Información bancaria del proyecto (pie_derecha)
  if (proyecto.pie_derecha) {
    let rightY = bankingSectionY + 6;
    proyecto.pie_derecha.split("\n").forEach((line) => {
      if (line.trim()) {
        // Determinar el tamaño de fuente basado en el contenido
        let fontSize = 5;
        let fontWeight = "normal";
        if (line.includes("CLABE") || line.includes("BANCO") || line.includes("INBURSA")) {
          fontSize = 6;
          fontWeight = "bold";
        }
        doc.setFont("helvetica", fontWeight);
        doc.setFontSize(fontSize);
        splitTextIntoLines(line.trim(), rightColumnWidth, fontSize).forEach((wrappedLine) => {
          doc.text(wrappedLine, rightColumnX, rightY);
          rightY += 2.5;
        });
        // Reset font para la siguiente línea
        doc.setFont("helvetica", "normal");
      } else {
        rightY += 1.5;
      }
    });
  } else {
    // Fallback si no hay información bancaria
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(31, 41, 55);
    let rightY = bankingSectionY + 6;
    splitTextIntoLines("INFORMACIÓN BANCARIA", rightColumnWidth, 7).forEach((line) => {
      doc.text(line, rightColumnX, rightY);
      rightY += 3.5;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    splitTextIntoLines("No disponible", rightColumnWidth, 6).forEach((line) => {
      doc.text(line, rightColumnX, rightY);
      rightY += 2.5;
    });
  }

  // Disclaimer al final de la sección
  doc.setFont("helvetica", "italic");
  doc.setFontSize(5);
  doc.setTextColor(239, 68, 68); // Rojo para destacar

  // Posición estimada: máximo de 15 líneas por columna
  const estimatedMaxLines = 15;
  const estimatedMaxY = bankingSectionY + 6 + estimatedMaxLines * 4;
  const disclaimerY = Math.max(estimatedMaxY + 5, bankingSectionY + 50);
  splitTextIntoLines("Este comprobante no tiene validez fiscal.", rightColumnWidth, 5).forEach((line, index) => {
    doc.text(line, rightColumnX, disclaimerY + index * 3);
  });
}

/** Pie del PDF del correo: recordatorio de pago, datos de la administración y cuentas bancarias. */
function drawEmailPaymentInfo(doc: JsPDF, { margin, contentWidth }: StatementPdfLayout, bankingSectionY: number): void {
  const leftColumnX = margin + 5;
  const rightColumnX = margin + contentWidth / 2 + 10;

  // COLUMNA IZQUIERDA - Recordatorio de pago e instrucciones
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(17, 24, 39);
  doc.text("Estimado Condómino: La fecha de pago de la cuota", leftColumnX, bankingSectionY + 6);
  doc.text("ordinaria son los primeros 7 días hábiles del mes.", leftColumnX, bankingSectionY + 10);
  doc.text("A partir del día 8 genera interés moratorio", leftColumnX, bankingSectionY + 14);
  doc.text("(artículo 3.9 del reglamento).", leftColumnX, bankingSectionY + 18);

  // Información de la empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("ADMINISTRADORA VAL'QUIRICO A.C.", leftColumnX, bankingSectionY + 25);
  doc.text("RFC: AVA1706221G3", leftColumnX, bankingSectionY + 29);

  // Instrucciones de pago
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text("1. Solo pagos por transferencia, terminal", leftColumnX, bankingSectionY + 35);
  doc.text("   bancaria y domiciliados.", leftColumnX, bankingSectionY + 39);
  doc.text("2. No depósitos en efectivo.", leftColumnX, bankingSectionY + 43);
  doc.text("3. Comprobantes con VQ# + Tipo + Mes/Año.", leftColumnX, bankingSectionY + 47);
  doc.text("4. Pagos sin identificar no se procesan.", leftColumnX, bankingSectionY + 51);

  // COLUMNA DERECHA - Información bancaria
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  doc.text("INBURSA", rightColumnX, bankingSectionY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("CLABE: 036650500395989048", rightColumnX, bankingSectionY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("BANCO DEL BAJIO", rightColumnX, bankingSectionY + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("CLABE: 030650900014356383", rightColumnX, bankingSectionY + 26);

  // Disclaimer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(5);
  doc.setTextColor(239, 68, 68); // Rojo para destacar
  doc.text("Este comprobante no tiene", rightColumnX, bankingSectionY + 35);
  doc.text("   validez fiscal.", rightColumnX, bankingSectionY + 39);
}
