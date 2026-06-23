import { jsPDF } from "jspdf";

export interface Form86Data {
  folio: string;
  fechaEmision: string;
  fechaVigencia: string;
  nombreComercial: string;
  razonSocial: string;
  rfc: string;
  propietario: string;
  representanteLegal: string;
  registroImpi: string;
  arrendador: string;
  apol: string;
  fap: string;
  calle: string;
  barrio: string;
  m2: string;
  nivelEdificio: string;
  usoSuelo: string;
  sistemasPretratamiento: string;
  comodato: string;
  numMesasSillas: string;
  horariosAtencion: string;
  inicioConstruccion: string;
  finConstruccion: string;
  costoRevision: string;
  costoInicioConstruccion: string;
  giros: Array<{ clave: string; descripcion: string }>;
  descripcionProductos: string;
}

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  if (typeof window === "undefined") return "";
  try {
    const origin = window.location.origin;
    const res = await fetch(`${origin}${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("fetchImageAsBase64 failed for: ", url, error);
    return "";
  }
};

export async function generateForm86Pdf(data: Form86Data, condo: "sassi" | "valquirico", download = true): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // Letter size: 215.9 x 279.4 mm
  });

  // Fetch logos
  let logo1Base64 = "";
  let logo2Base64 = "";
  try {
    logo1Base64 = await fetchImageAsBase64("/brand/reinos-de-mexico-logo-c.png");
  } catch (e) {
    console.warn("Failed to load logo 1", e);
  }
  try {
    logo2Base64 = await fetchImageAsBase64(condo === "sassi" ? "/imagenes/sassi.png" : "/brand/valquirico-logo-light.png");
  } catch (e) {
    console.warn("Failed to load logo 2", e);
  }

  // Draw Header Logos
  if (logo1Base64) {
    doc.addImage(logo1Base64, "PNG", 12, 8, 20, 20);
  }
  if (logo2Base64) {
    if (condo === "sassi") {
      doc.addImage(logo2Base64, "PNG", 38, 8, 20, 20);
    } else {
      doc.addImage(logo2Base64, "PNG", 38, 12, 28, 12);
    }
  }

  // Header Title Text
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(14);
  doc.text("Aprobación de proyecto", 155, 16, { align: "center" });

  // Subtitle with gray box background
  doc.setFillColor(235, 237, 240);
  doc.rect(105, 20, 100, 8, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Sector económico-comercio", 155, 25.5, { align: "center" });

  // Helper row drawers
  const drawRow = (x: number, y: number, w: number, h: number, label: string, val: string, isShaded: boolean) => {
    if (isShaded) {
      doc.setFillColor(248, 249, 250);
      doc.rect(x, y, w, h, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 37, 41);
    doc.text(label, x + 2, y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(val || "—", x + w - 2, y + 4, { align: "right" });
  };

  const drawSplitRow = (
    x: number,
    y: number,
    w: number,
    h: number,
    l1: string,
    v1: string,
    l2: string,
    v2: string,
    isShaded: boolean
  ) => {
    if (isShaded) {
      doc.setFillColor(248, 249, 250);
      doc.rect(x, y, w, h, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(33, 37, 41);
    
    // Position labels nicely
    doc.text(l1, x + 18, y + 4, { align: "right" });
    doc.text(l2, x + (w / 2) + 20, y + 4, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text(v1 || "—", x + 21, y + 4);
    doc.text(v2 || "—", x + (w / 2) + 23, y + 4);
  };

  // --- Box 1: Forma 8-6/1.2 ---
  let currentY = 32;
  doc.setFillColor(51, 122, 183); // Blue background
  doc.rect(12, currentY, 85, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Forma 8-6/1.2", 54.5, currentY + 5, { align: "center" });

  currentY += 7;
  drawRow(12, currentY, 85, 5.5, "Folio", data.folio, false);
  currentY += 5.5;
  drawRow(12, currentY, 85, 5.5, "Fecha de emisión", data.fechaEmision, true);
  currentY += 5.5;
  drawRow(12, currentY, 85, 5.5, "Fecha de vigencia", data.fechaVigencia, false);

  // Outline Box 1
  doc.setDrawColor(200, 200, 200);
  doc.rect(12, 32, 85, 23.5);

  // --- Box 2: Datos generales & Otras especificaciones ---
  // Left Column (Datos generales)
  let yLeft = 60;
  doc.setFillColor(0, 91, 127); // Teal/Blue
  doc.rect(12, yLeft, 95, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Datos generales", 59.5, yLeft + 5, { align: "center" });

  yLeft += 7;
  drawRow(12, yLeft, 95, 5.5, "Nombre comercial", data.nombreComercial, false);
  yLeft += 5.5;
  drawRow(12, yLeft, 95, 5.5, "Razón Social", data.razonSocial, true);
  yLeft += 5.5;
  drawRow(12, yLeft, 95, 5.5, "RFC", data.rfc, false);
  yLeft += 5.5;
  drawRow(12, yLeft, 95, 5.5, "Propietario", data.propietario, true);
  yLeft += 5.5;
  drawRow(12, yLeft, 95, 5.5, "Representante Legal", data.representanteLegal, false);
  yLeft += 5.5;
  drawRow(12, yLeft, 95, 5.5, "Registro IMPI", data.registroImpi, true);
  yLeft += 5.5;
  drawRow(12, yLeft, 95, 5.5, "Arrendador", data.arrendador, false);
  yLeft += 5.5;
  
  // Direccion Subheader
  doc.setFillColor(220, 224, 230);
  doc.rect(12, yLeft, 95, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  doc.text("Dirección", 59.5, yLeft + 4, { align: "center" });
  yLeft += 5.5;

  drawSplitRow(12, yLeft, 95, 5.5, "Apol:", data.apol, "FAP:", data.fap, false);
  yLeft += 5.5;
  drawSplitRow(12, yLeft, 95, 5.5, "Calle:", data.calle, "Barrio:", data.barrio, true);
  yLeft += 5.5;
  drawSplitRow(12, yLeft, 95, 5.5, "M2:", data.m2, "Nivel en edificio:", data.nivelEdificio, false);
  yLeft += 5.5;

  // Outline Left Column Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(12, 60, 95, 61);

  // Right Column (Otras especificaciones)
  let yRight = 60;
  doc.setFillColor(138, 138, 138); // Gray
  doc.rect(110, yRight, 95, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Otras especificaciones", 157.5, yRight + 5, { align: "center" });

  yRight += 7;
  drawRow(110, yRight, 95, 5.5, "Uso de suelo", data.usoSuelo, false);
  yRight += 5.5;
  drawRow(110, yRight, 95, 5.5, "Sistemas de Pretratamiento", data.sistemasPretratamiento, true);
  yRight += 5.5;
  drawRow(110, yRight, 95, 5.5, "Comodato", data.comodato, false);
  yRight += 5.5;
  drawRow(110, yRight, 95, 5.5, "Número de mesas y sillas", data.numMesasSillas, true);
  yRight += 5.5;

  // Horarios de atencion (Taller Row)
  doc.setFillColor(248, 249, 250);
  doc.rect(110, yRight, 95, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(33, 37, 41);
  doc.text("Horarios de atención", 112, yRight + 4);
  doc.setFont("helvetica", "normal");
  
  // Wrap text inside Horarios
  const wrappedHorarios = doc.splitTextToSize(data.horariosAtencion || "—", 90);
  doc.text(wrappedHorarios, 112, yRight + 7.5);
  yRight += 11;

  drawRow(110, yRight, 95, 5.5, "Inicio de construcción", data.inicioConstruccion, false);
  yRight += 5.5;
  drawRow(110, yRight, 95, 5.5, "Fin de construcción", data.finConstruccion, true);
  yRight += 5.5;
  drawRow(110, yRight, 95, 5.5, "Costo por revisión", data.costoRevision, false);
  yRight += 5.5;
  drawRow(110, yRight, 95, 5.5, "Costo por inicio de construcción", data.costoInicioConstruccion, true);
  yRight += 5.5;

  // Outline Right Column Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(110, 60, 95, 61);

  // --- Box 3: Giro(s) Comercial(es) Asignado(s) ---
  let yGiros = 126;
  doc.setFillColor(58, 127, 35); // Green banner
  doc.rect(12, yGiros, 193, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Giro(s) Comercial(es) Asignado(s)", 108.5, yGiros + 5, { align: "center" });

  yGiros += 7;
  // Subheaders Clave | Descripción
  doc.setFillColor(72, 145, 48);
  doc.rect(12, yGiros, 193, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Clave", 14, yGiros + 3.8);
  doc.text("Descripción", 55, yGiros + 3.8);

  yGiros += 5;
  const numGiroRows = 4;
  for (let i = 0; i < numGiroRows; i++) {
    const item = data.giros[i] || { clave: "", descripcion: "" };
    const isShaded = i % 2 === 1;
    if (isShaded) {
      doc.setFillColor(248, 249, 250);
      doc.rect(12, yGiros, 193, 5, "F");
    }
    
    // Draw borders
    doc.setDrawColor(230, 230, 230);
    doc.line(12, yGiros + 5, 205, yGiros + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(item.clave, 14, yGiros + 3.8);
    doc.text(item.descripcion, 55, yGiros + 3.8);
    yGiros += 5;
  }
  
  // Vertical split line inside the Giros table
  doc.setDrawColor(220, 220, 220);
  doc.line(50, 133, 50, yGiros);

  // Outer border for Giros table
  doc.setDrawColor(200, 200, 200);
  doc.rect(12, 126, 193, yGiros - 126);

  // --- Box 4: Descripción de productos y/o servicios ---
  let yProd = yGiros + 4;
  doc.setFillColor(27, 78, 135); // Dark blue banner
  doc.rect(12, yProd, 193, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Descripción de productos y/o servicios que ofrece:", 108.5, yProd + 5, { align: "center" });

  yProd += 7;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  doc.rect(12, yProd, 193, 18, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  const wrappedProducts = doc.splitTextToSize(data.descripcionProductos || "", 189);
  doc.text(wrappedProducts, 14, yProd + 4.5);

  // --- Box 5: Footer Signature Boxes ---
  let yFoot = yProd + 23;
  // Left Box
  doc.setFillColor(240, 242, 245);
  doc.rect(12, yFoot, 95, 16, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Condominio", 59.5, yFoot + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  const condoNameLabel = condo === "sassi" ? "Sassi del Valle Condominio A.C." : "Val'Quirico Condominio A.C.";
  doc.text(condoNameLabel, 59.5, yFoot + 11.5, { align: "center" });
  doc.setDrawColor(210, 210, 210);
  doc.rect(12, yFoot, 95, 16);

  // Right Box
  doc.setFillColor(240, 242, 245);
  doc.rect(110, yFoot, 95, 16, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Comision de Actividad", 157.5, yFoot + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  doc.text("Económica", 157.5, yFoot + 11.5, { align: "center" });
  doc.rect(110, yFoot, 95, 16);

  // --- Box 6: Sello ---
  let ySello = yFoot + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(33, 37, 41);
  doc.text("Sello", 108.5, ySello, { align: "center" });

  ySello += 2.5;
  doc.setFillColor(217, 237, 247); // Light blue
  doc.setDrawColor(51, 122, 183);
  doc.rect(12, ySello, 193, 19, "FD");

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(8.5);
  doc.setTextColor(49, 112, 143); // Darker blue for text
  const sealACName = condo === "sassi" ? "Sassi del valle Condominio A.C." : "Administradora Valquirico A.C.";
  doc.text(sealACName, 108.5, ySello + 4.5, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  if (condo === "sassi") {
    doc.text("LOTEX FR. 2 y LOTE X FR. 3 S/M localizados en Camino Ensenada-Guadalupe,", 108.5, ySello + 9.5, { align: "center" });
    doc.text("Colonia Guadalupe, Ensenada, Baja California, \"Los Olivares\".", 108.5, ySello + 13.5, { align: "center" });
  } else {
    doc.text("Carretera Santa Isabel Tetlatlahuca Km 2,", 108.5, ySello + 9.5, { align: "center" });
    doc.text("Nativitas, Tlaxcala, C.P. 90710.", 108.5, ySello + 13.5, { align: "center" });
  }

  // Save the PDF
  if (download) {
    doc.save(`Forma_8-6_1.2_${data.folio || "empty"}.pdf`);
  }
  return doc.output("blob");
}
