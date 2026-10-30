import type { GeneralReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";

/**
 * PDF "Reporte general de adeudos" (botón "Exportar PDF" del reporte general). jsPDF y
 * jspdf-autotable se importan bajo demanda para no cargarlos con la pantalla.
 */
type AreaReporte = GeneralReport["areas"][number];

export const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const formatCurrency = (amount: number | null | undefined) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount || 0);
};

/** Arma el documento con las áreas visibles (ya filtradas). */
export async function buildReporteGeneralPdf(filteredAreas: AreaReporte[]) {
  // Importar dinámicamente las librerías
  const { jsPDF } = await import("jspdf");
  // jspdf-autotable 5 ya no se instala solo sobre jsPDF al importarlo como módulo
  // (`doc.autoTable` no existe): se usa su API funcional `autoTable(doc, opciones)`.
  const { autoTable } = await import("jspdf-autotable");

  // Crear instancia de jsPDF
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Configuración de fuentes y colores
  const fechaActual = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const anioActual = new Date().getFullYear();

  // Encabezado con fondo de color
  doc.setFillColor(31, 41, 55); // gray-800
  doc.rect(0, 0, doc.internal.pageSize.width, 35, "F");

  // Título del documento
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE GENERAL DE ADEUDOS", 148, 14, { align: "center" });

  // Subtítulo con año
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Año ${anioActual}`, 148, 22, { align: "center" });

  // Fecha de generación
  doc.setFontSize(8);
  doc.text(`Generado: ${fechaActual}`, 148, 29, { align: "center" });

  // Restablecer color de texto
  doc.setTextColor(0, 0, 0);

  // Preparar datos de la tabla
  const headers = [
    "Tipo",
    "Identificación",
    "Status",
    "Anual",
    ...meses.map((m) => m.substring(0, 3)), // Abreviar nombres de meses
  ];

  const data = filteredAreas.map((area) => [
    area.tipo,
    area.identificador,
    area.status,
    formatCurrency(area.saldo_pendiente),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) =>
      formatCurrency(area.meses[mes] || 0)
    ),
  ]);

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 42,
    theme: "striped",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      lineColor: [229, 231, 235], // gray-200
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [31, 41, 55], // gray-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 7,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "left", fontStyle: "bold" }, // Tipo
      1: { cellWidth: 38, halign: "left" }, // Identificación
      2: { cellWidth: 18, halign: "center" }, // Status
      3: {
        cellWidth: 24,
        halign: "right",
        fontStyle: "bold",
        textColor: [185, 28, 28], // red-700 para el total anual
      }, // Anual
      // Meses (12 columnas) - con ancho uniforme
      4: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      5: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      6: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      7: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      8: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      9: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      10: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      11: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      12: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      13: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      14: { cellWidth: 14, halign: "right", fontSize: 6.5 },
      15: { cellWidth: 14, halign: "right", fontSize: 6.5 },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50
    },
    margin: { top: 42, left: 10, right: 10, bottom: 20 },
    didDrawPage: function (data) {
      // Encabezado en páginas adicionales
      if (data.pageNumber > 1) {
        doc.setFillColor(31, 41, 55);
        doc.rect(0, 0, doc.internal.pageSize.width, 15, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE GENERAL DE ADEUDOS - Continuación", 148, 10, {
          align: "center",
        });
        doc.setTextColor(0, 0, 0);
      }

      // Pie de página mejorado
      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;

      // Línea separadora
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);

      // Número de página
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        148,
        pageHeight - 8,
        { align: "center" }
      );

      // Marca de confidencialidad
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28); // red-700
      doc.text(
        "INFORMACIÓN CONFIDENCIAL",
        pageWidth - 10,
        pageHeight - 8,
        { align: "right" }
      );

      // Fecha en el pie
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(fechaActual, 10, pageHeight - 8, { align: "left" });

      doc.setTextColor(0, 0, 0);
    },
  });

  return doc;
}

/** Nombre con el que se descarga el PDF. */
export const reporteGeneralPdfFileName = () =>
  `reporte-general-adeudos-${new Date().toISOString().split("T")[0]}.pdf`;
