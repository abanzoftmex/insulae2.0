/**
 * Piezas de jsPDF idénticas en los PDF de estado de cuenta de propiedad y de arrendamiento
 * (A4 vertical, mm): paneles de resumen, columnas por tipo de cuota, encabezado de la tabla de
 * movimientos y numeración de páginas. Réplica exacta del dibujo del minisitio: no cambiar
 * coordenadas, fuentes ni el orden de las llamadas (el estado de color/fuente se arrastra).
 */
import type { jsPDF as JsPDF } from "jspdf";

export type { JsPDF };

export interface StatementPdfLayout {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

/** Documento A4 vertical en mm. jsPDF se carga bajo demanda (solo al generar el PDF). */
export async function createStatementDoc(): Promise<{ doc: JsPDF; layout: StatementPdfLayout }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  return { doc, layout: { pageWidth, pageHeight, margin, contentWidth: pageWidth - margin * 2 } };
}

export function splitText(doc: JsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

/**
 * Paneles "DEBE AL DÍA / SALDO A FAVOR" (izquierda) y "CARGOS TOTALES" (derecha), 50/50.
 * Devuelve la Y siguiente.
 */
export function drawSummaryPanels(
  doc: JsPDF,
  { margin, contentWidth }: StatementPdfLayout,
  startY: number,
  pageBottomLimit: number,
  values: { debe: string; favor: string; cargos: string },
): number {
  let currentY = startY;
  const panelGap = 5;
  const leftPanelW = Math.floor((contentWidth - panelGap) / 2);
  const rightPanelW = contentWidth - leftPanelW - panelGap;
  const leftPanelX = margin;
  const rightPanelX = margin + leftPanelW + panelGap;
  const panelH = 20;

  // Verificar espacio disponible; si no cabe, saltar página
  if (currentY + panelH > pageBottomLimit) {
    doc.addPage();
    currentY = margin + 5;
  }

  // Panel izquierdo con dos columnas
  doc.roundedRect(leftPanelX, currentY, leftPanelW, panelH, 3, 3, "S");
  const innerPad = 5;
  const leftInnerX = leftPanelX + innerPad;
  const leftInnerW = leftPanelW - innerPad * 2;
  const leftColW2 = leftInnerW / 2;
  const titleY = currentY + 6;
  const valueY = currentY + panelH - 4; // valor cerca de la parte inferior

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text("DEBE AL DÍA", leftInnerX, titleY);
  doc.text("SALDO A FAVOR", leftInnerX + leftColW2, titleY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  // Debe (rojo)
  doc.setTextColor(239, 68, 68);
  doc.text(values.debe, leftInnerX, valueY);
  // Favor (verde)
  doc.setTextColor(34, 197, 94);
  doc.text(values.favor, leftInnerX + leftColW2, valueY);

  // Panel derecho: CARGOS TOTALES
  doc.setTextColor(31, 41, 55);
  doc.roundedRect(rightPanelX, currentY, rightPanelW, panelH, 3, 3, "S");
  const rx = rightPanelX + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CARGOS TOTALES", rx, titleY);
  doc.setFontSize(12);
  doc.text(values.cargos, rx, valueY);

  return currentY + panelH + 4;
}

export type SummaryItem = [label: string, value: string];

/**
 * Dos columnas 50/50 sin bordes (DEBE AL DÍA | CARGOS TOTALES) con etiqueta a la izquierda,
 * monto en negritas a la derecha y separadores negros. Devuelve la Y siguiente.
 */
export function drawSummaryColumns(
  doc: JsPDF,
  { margin, contentWidth }: StatementPdfLayout,
  startY: number,
  pageBottomLimit: number,
  itemsLeft: SummaryItem[],
  itemsRight: SummaryItem[],
): number {
  let currentY = startY;
  const secGap = 5;
  const colW2 = Math.floor((contentWidth - secGap) / 2);
  const col1X = margin;
  const col2X = margin + colW2 + secGap;
  const pad2 = 5;
  const lineH = 7;

  const boxH1 = itemsLeft.length * lineH + 10;
  const boxH2 = itemsRight.length * lineH + 10;
  const secH = Math.max(boxH1, boxH2);

  if (currentY + secH > pageBottomLimit) {
    doc.addPage();
    currentY = margin + 5;
  }

  const drawColumn = (items: SummaryItem[], x: number) => {
    let y = currentY + 8;
    items.forEach(([label, value], idx) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      // Etiqueta a la izquierda
      doc.text(label, x + pad2, y);
      // Valor alineado a la derecha
      const valW = doc.getTextWidth(String(value));
      const valX = x + colW2 - pad2 - valW;
      doc.setFont("helvetica", "bold");
      doc.text(String(value), valX, y);
      if (idx < items.length - 1) {
        doc.setLineWidth(0.2);
        doc.setDrawColor(0, 0, 0); // separador negro
        doc.line(x + 1, y + 2, x + colW2 - 1, y + 2);
      }
      y += lineH;
    });
  };
  drawColumn(itemsLeft, col1X);
  drawColumn(itemsRight, col2X);

  return currentY + secH + 6;
}

export const MOVEMENT_HEADERS = [
  "Tipo de cuota",
  "Concepto",
  "Fecha de cobro",
  "Fecha límite de pago",
  "Fecha de pago",
  "Cargo",
  "Abono",
  "Intereses moratorios",
  "Descuento",
  "Saldo",
];

/**
 * Encabezado oscuro (multi-línea) de la tabla de movimientos; se reimprime tras cada salto
 * de página. Deja la fuente en negritas/8 y devuelve la Y de la primera fila.
 */
export function drawMovementsHeader(
  doc: JsPDF,
  { margin, contentWidth, pageWidth }: StatementPdfLayout,
  y: number,
  widths: number[],
): number {
  doc.setFillColor(31, 41, 55);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const headerHeight = 12;
  doc.rect(margin, y - 3, contentWidth, headerHeight, "F");

  let hx = margin + 2;
  MOVEMENT_HEADERS.forEach((h, idx) => {
    if (h === "Fecha de cobro") {
      doc.text("Fecha de", hx, y + 1.5);
      doc.text("cobro", hx, y + 5.5);
    } else if (h === "Fecha límite de pago") {
      doc.text("Fecha límite", hx, y + 1.5);
      doc.text("de pago", hx, y + 5.5);
    } else if (h === "Fecha de pago") {
      doc.text("Fecha de", hx, y + 1.5);
      doc.text("pago", hx, y + 5.5);
    } else if (h === "Intereses moratorios") {
      doc.text("Intereses", hx, y + 1.5);
      doc.text("moratorios", hx, y + 5.5);
    } else {
      doc.text(h, hx, y + 3.5);
    }
    hx += widths[idx];
  });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  const headerBottomY = y - 3 + headerHeight;
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
  return y + headerHeight;
}

/** "Página i de n" y "Generado el …" al pie de cada página. */
export function drawPageFooters(doc: JsPDF, { margin, pageWidth, pageHeight }: StatementPdfLayout): void {
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(128, 128, 128);
    // Posicionar debajo del footer (footer termina en pageHeight - 10)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 8);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-MX")}`, margin, pageHeight - 8);
  }
}
