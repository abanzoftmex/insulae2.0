/**
 * Reporte PDF de propiedades (antes `generatePropertiesReport` dentro de pages/propiedades.js).
 * Se ejecuta solo en el navegador (jsPDF se importa dinámicamente).
 */
import type { MinisitioUser } from "@/modules/minisitio/domain/types";
import type { ProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { fetchImageAsDataUrlAction } from "@/app/(minisitio)/minisitio/_actions/account";
import { organizarPropiedadesHierarquicamente } from "./propiedades-organizer";
import { parseNum, type PropiedadView } from "./propiedades-format";

type RGB = [number, number, number];

/** Logo del proyecto: insulae2.0 guarda la URL completa (Firebase); se conserva la ruta legacy por si llega solo el nombre. */
function projectLogoUrl(proyecto: ProjectInfo | null): string {
  if (!proyecto?.logo) return "https://encuesta.sistemasabanza.com/logo_dark.png";
  return /^https?:\/\//.test(proyecto.logo)
    ? proyecto.logo
    : `https://sistemasabanza.com/insulae/imagenes/proyectos/logo/${proyecto.logo}`;
}

// Función para cargar imagen
const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url.slice(0, 80)}`));
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });

/** Genera y descarga `reporte-propiedades-AAAA-MM-DD.pdf` con las propiedades filtradas. */
export async function generatePropertiesReportPdf({
  propiedades: filteredData,
  proyecto,
  user,
}: {
  propiedades: PropiedadView[];
  proyecto: ProjectInfo | null;
  user: MinisitioUser | null;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "landscape", // Usamos landscape para más espacio en la tabla
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm en landscape
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm en landscape
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const pageBottomLimit = pageHeight - margin - 20; // Reservar espacio para pie de página

  let currentY = margin + 5;

  // Header con logo y título
  const headerHeight = 40;

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55);
  doc.text("REPORTE DE PROPIEDADES", margin, currentY + 10);

  // Subtítulo con información del usuario
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(75, 85, 99);
  const fullName = [user?.nombre, user?.apaterno, user?.amaterno].filter(Boolean).join(" ") || "Usuario";
  doc.text(`Propietario: ${fullName}`, margin, currentY + 18);
  doc.text(`Total de propiedades: ${filteredData.length}`, margin, currentY + 26);

  // Logo del proyecto en la esquina superior derecha. Antes pasaba por /api/proxy-image;
  // ahora la server action lo descarga y lo devuelve como data URL (sin CORS).
  try {
    const logoUrl = projectLogoUrl(proyecto);
    const dataUrl = await fetchImageAsDataUrlAction(logoUrl);
    if (!dataUrl) throw new Error(`Failed to load image: ${logoUrl}`);

    const img = await loadImage(dataUrl);
    const maxW = 50;
    const maxH = 25;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const drawW = Math.max(1, img.width * scale);
    const drawH = Math.max(1, img.height * scale);
    const logoX = pageWidth - margin - drawW;
    const logoY = currentY;
    doc.addImage(img, "PNG", logoX, logoY, drawW, drawH);
  } catch (error) {
    console.warn("Error cargando logo del proyecto:", error);
    // Placeholder si no se puede cargar el logo
    const phW = 50;
    const phH = 25;
    const logoX = pageWidth - margin - phW;
    const logoY = currentY;
    doc.setDrawColor(150, 150, 150);
    doc.rect(logoX, logoY, phW, phH);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Logo", logoX + 3, logoY + phH / 2);
  }

  currentY += headerHeight + 10;

  // Resumen general - Solo propiedades activas
  const activePropiedades = filteredData.filter((prop) => prop.id_cat_status === 1);
  const totalM2 = activePropiedades.reduce((total, prop) => total + (parseNum(prop.m2_totales) || 0), 0);
  const totalM2Construccion = activePropiedades.reduce((total, prop) => total + (parseNum(prop.m2_construccion) || 0), 0);
  const totalIndiviso = activePropiedades.reduce((total, prop) => total + (parseNum(prop.indiviso) || 0), 0);

  // Panel de resumen
  const summaryHeight = 35;
  doc.setFillColor(249, 250, 251); // Gris muy claro
  doc.rect(margin, currentY, contentWidth, summaryHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text("RESUMEN GENERAL", margin + 5, currentY + 8);

  // Estadísticas en columnas
  const colWidth = contentWidth / 3;
  let colX = margin + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Columna 1: M² Totales
  doc.setTextColor(55, 65, 81);
  doc.text("M² Totales:", colX, currentY + 16);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalM2.toLocaleString()} m²`, colX, currentY + 22);

  // Columna 2: M² Construcción
  colX += colWidth;
  doc.setFont("helvetica", "normal");
  doc.text("M² Construcción:", colX, currentY + 16);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalM2Construccion.toLocaleString()} m²`, colX, currentY + 22);

  // Columna 3: Indiviso Total
  colX += colWidth;
  doc.setFont("helvetica", "normal");
  doc.text("Indiviso Total:", colX, currentY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 124, 194); // Azul
  doc.text(`${totalIndiviso.toFixed(4)}%`, colX, currentY + 22);

  currentY += summaryHeight + 5;

  // Panel de estado financiero
  const financialSummaryHeight = 30;
  doc.setFillColor(243, 244, 246); // Gris muy claro
  doc.rect(margin, currentY, contentWidth, financialSummaryHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text("ESTADO FINANCIERO", margin + 5, currentY + 8);

  // Calcular estadísticas financieras - Solo propiedades activas
  const propiedadesAlCorriente = activePropiedades.filter((p) => parseNum(p.saldo_pendiente || 0) <= 0).length;
  const propiedadesConAdeudo = activePropiedades.filter((p) => parseNum(p.saldo_pendiente || 0) > 0).length;
  const totalSaldoPendiente = activePropiedades.reduce((sum, p) => sum + parseNum(p.saldo_pendiente || 0), 0);

  // Estadísticas financieras en columnas
  const finColWidth = contentWidth / 3;
  let finColX = margin + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Columna 1: Al Corriente
  doc.setTextColor(55, 65, 81);
  doc.text("Propiedades al Corriente:", finColX, currentY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94); // Verde
  doc.text(`${propiedadesAlCorriente}`, finColX, currentY + 22);

  // Columna 2: Con Adeudo
  finColX += finColWidth;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text("Propiedades con Adeudo:", finColX, currentY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38); // Rojo
  doc.text(`${propiedadesConAdeudo}`, finColX, currentY + 22);

  // Columna 3: Total Saldo Pendiente
  finColX += finColWidth;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text("Saldo Pendiente Total:", finColX, currentY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    totalSaldoPendiente > 0 ? 220 : 34,
    totalSaldoPendiente > 0 ? 38 : 197,
    totalSaldoPendiente > 0 ? 38 : 94,
  );
  doc.text(
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(totalSaldoPendiente),
    finColX,
    currentY + 22,
  );

  doc.setTextColor(31, 41, 55); // Restaurar color
  currentY += financialSummaryHeight + 10;

  // Tabla de propiedades
  const columnWidths = [50, 30, 28, 20, 22, 45, 35, 40]; // Anchos de columnas ajustados
  const headers = [
    "Propiedad",
    "M² Totales",
    "M² Construcción",
    "Indiviso %",
    "Indiv. FAP/C.",
    "Estado Financiero",
    "Barrio",
    "Uso de Suelo",
  ];

  // Header de la tabla
  const tableHeaderHeight = 12;
  if (currentY + tableHeaderHeight > pageBottomLimit) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFillColor(31, 41, 55); // Azul oscuro
  doc.rect(margin, currentY, contentWidth, tableHeaderHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);

  let headerX = margin + 2;
  headers.forEach((header, idx) => {
    doc.text(header, headerX, currentY + 8);
    headerX += columnWidths[idx];
  });

  currentY += tableHeaderHeight;

  // Filas de datos
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  const rowHeight = 8;

  // Usar la función centralizada de organización
  const propiedadesOrganizadas = organizarPropiedadesHierarquicamente(filteredData);

  // Iterar directamente sobre propiedades organizadas (ya están en orden de ordenamiento)
  propiedadesOrganizadas.forEach((propiedad) => {
    // Verificar si necesitamos nueva página
    if (currentY + rowHeight > pageBottomLimit) {
      doc.addPage();
      currentY = margin + 5;

      // Repetir header en nueva página
      doc.setFillColor(31, 41, 55);
      doc.rect(margin, currentY, contentWidth, tableHeaderHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);

      let headerX = margin + 2;
      headers.forEach((header, idx) => {
        doc.text(header, headerX, currentY + 8);
        headerX += columnWidths[idx];
      });

      currentY += tableHeaderHeight;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
    }

    // Línea superior simple
    doc.setLineWidth(0.1);
    doc.setDrawColor(229, 231, 235); // Gris claro
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // Contenido de la fila
    let cellX = margin + 2;

    // Propiedad
    const propText = doc.splitTextToSize(`${propiedad.iniciales || propiedad.nombre}`, columnWidths[0] - 4);
    doc.text(propText[0], cellX, currentY + 6); // Solo primera línea
    cellX += columnWidths[0];

    // M² Totales
    const m2Totales = `${(parseNum(propiedad.m2_totales) || 0).toLocaleString()}`;
    doc.text(m2Totales, cellX, currentY + 6);
    cellX += columnWidths[1];

    // M² Construcción
    const m2Construccion = `${(parseNum(propiedad.m2_construccion) || 0).toLocaleString()}`;
    doc.text(m2Construccion, cellX, currentY + 6);
    cellX += columnWidths[2];

    // Indiviso
    const indiviso = propiedad.indiviso !== null ? `${(parseNum(propiedad.indiviso) || 0).toFixed(4)}%` : "0.0000%";
    doc.text(indiviso, cellX, currentY + 6);
    cellX += columnWidths[3];

    // Indiviso FAP/Condominio
    const indivisoFAP =
      propiedad.indiviso_fap_condominio !== null ? `${propiedad.indiviso_fap_condominio.toFixed(4)}%` : "—";
    doc.text(indivisoFAP, cellX, currentY + 6);
    cellX += columnWidths[4];

    // Estado Financiero
    const saldoPendiente = parseNum(propiedad.saldo_pendiente || 0);
    let estadoFinanciero = "Al corriente";
    let estadoColor: RGB = [34, 197, 94]; // Verde

    if (saldoPendiente > 0) {
      const saldoVencido = parseNum(propiedad.saldo_vencido || 0);
      if (saldoVencido > 0) {
        estadoFinanciero = `Vencido: ${new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(saldoPendiente)}`;
        estadoColor = [220, 38, 38]; // Rojo
      } else {
        estadoFinanciero = `Pendiente: ${new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(saldoPendiente)}`;
        estadoColor = [234, 179, 8]; // Amarillo
      }
    } else if (saldoPendiente < 0) {
      estadoFinanciero = `A favor: ${new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(Math.abs(saldoPendiente))}`;
      estadoColor = [59, 130, 246]; // Azul
    }

    doc.setTextColor(...estadoColor);
    const estadoText = doc.splitTextToSize(estadoFinanciero, columnWidths[5] - 4);
    doc.text(estadoText[0], cellX, currentY + 6);
    doc.setTextColor(31, 41, 55); // Restaurar color
    cellX += columnWidths[5];

    // Barrio
    const barrioText = doc.splitTextToSize(propiedad.zona || "Sin barrio", columnWidths[6] - 4);
    doc.text(barrioText[0], cellX, currentY + 6);
    cellX += columnWidths[6];

    // Uso de Suelo
    const usoText = doc.splitTextToSize(propiedad.uso_suelo || "Sin uso", columnWidths[7] - 4);
    doc.text(usoText[0], cellX, currentY + 6);

    // Línea inferior
    doc.setLineWidth(0.1);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    currentY += rowHeight;
  });

  // Pie de página
  const footerY = pageHeight - margin - 15;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);

  // Información de generación
  const fechaGeneracion = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.text(`Reporte generado el ${fechaGeneracion}`, margin, footerY);
  doc.text(`Total de propiedades: ${filteredData.length}`, margin, footerY + 5);

  // Número de página
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, footerY);
  }

  // Generar y descargar el PDF
  const fileName = `reporte-propiedades-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
