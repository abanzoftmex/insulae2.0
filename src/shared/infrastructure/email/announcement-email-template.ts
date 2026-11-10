/**
 * Plantilla HTML institucional para correos de Convocatoria / Asamblea.
 *
 * Sigue fielmente la línea visual institucional de Insulae 2.0 / Val'Quirico:
 * - Azul principal: #304854
 * - Dorado beige: #d0b685
 * - Negro / textos: #000000 / #1e293b
 * - Blanco para fondos de lectura y contrastes: #ffffff
 *
 * Implementado con tablas anidadas y CSS inline para máxima compatibilidad
 * con Gmail, Outlook (MSO), Apple Mail y dispositivos móviles.
 */

export interface AnnouncementDateEmailItem {
  callType: string;
  formattedDate: string;
  time?: string | null;
  location?: string | null;
}

export interface AnnouncementEmailOptions {
  recipientName?: string;
  condominiumName?: string;
  announcementName: string;
  typeName: string;
  subtypeName: string;
  dates: AnnouncementDateEmailItem[];
  portalUrl: string;
  pdfUrl?: string | null;
  logoUrl?: string;
  topics?: string[];
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildAnnouncementInvitationEmailHtml({
  recipientName = "Apreciable condómino",
  condominiumName = "Val'Quirico",
  announcementName,
  typeName,
  subtypeName,
  dates,
  portalUrl,
  pdfUrl,
  logoUrl,
  topics = [],
}: AnnouncementEmailOptions): string {
  const safeCondo = escapeHtml(condominiumName);
  const safeTitle = escapeHtml(announcementName);
  const safeRecipient = escapeHtml(recipientName);
  const safePortalUrl = escapeHtml(portalUrl);

  const cleanTypeName = typeName.replace(/reunion/gi, "Reunión");
  const cleanSubtypeName = subtypeName.replace(/reunion/gi, "Reunión");

  const isReunion =
    typeName.toLowerCase().includes("reunion") ||
    subtypeName.toLowerCase().includes("reunion");

  const documentLabel = isReunion ? "reunión" : "convocatoria";
  const documentLabelCap = isReunion ? "Reunión" : "Convocatoria";

  const resolvedLogoUrl =
    logoUrl || "https://valquirico.insulae.app/brand/valquirico-logo-light.png";

  let callsHtml = "";
  for (const dateItem of dates) {
    callsHtml += `
      <tr>
        <td style="padding: 12px 16px; background-color: #faf8f5; border: 1px solid #e2dbce; border-left: 4px solid #304854; border-radius: 6px; margin-bottom: 8px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom: 4px;">
                <span style="display: inline-block; background-color: #304854; color: #d0b685; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: 4px;">
                  ${escapeHtml(dateItem.callType)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="font-size: 13.5px; color: #1e293b; padding-top: 4px; line-height: 1.4;">
                <strong>Fecha:</strong> ${escapeHtml(dateItem.formattedDate)}${dateItem.time ? ` a las <strong>${escapeHtml(dateItem.time)} hrs</strong>` : ""}
              </td>
            </tr>
            ${
              dateItem.location
                ? `<tr>
                    <td style="font-size: 13px; color: #475569; padding-top: 3px;">
                      <strong>Lugar:</strong> ${escapeHtml(dateItem.location)}
                    </td>
                  </tr>`
                : ""
            }
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px; font-size: 8px; line-height: 8px;">&nbsp;</td></tr>
    `;
  }

  let topicsHtml = "";
  if (topics.length > 0) {
    topicsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; margin-bottom: 20px;">
        <tr>
          <td style="padding-bottom: 8px;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #304854;">
              Orden del Día / Temas
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e293b; line-height: 1.6;">
              ${topics.map((t) => `<li style="margin-bottom: 4px;">${escapeHtml(t)}</li>`).join("")}
            </ol>
          </td>
        </tr>
      </table>
    `;
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeCondo} - ${documentLabelCap}: ${safeTitle}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4efe8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Envoltura principal -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4efe8; table-layout: fixed; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 32px 12px 40px 12px;">

        <!-- Tarjeta Central (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2dbce; box-shadow: 0 4px 20px rgba(48, 72, 84, 0.12);">
          
          <!-- Encabezado Institucional Azul Navy -->
          <tr>
            <td align="center" style="background-color: #304854; padding: 28px 24px 24px 24px; border-bottom: 3px solid #d0b685;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 6px 0;">
                    <img src="${resolvedLogoUrl}" alt="${safeCondo}" width="200" style="display: block; max-width: 200px; width: 100%; height: auto; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0;">
                    <p style="margin: 0; font-size: 9.5px; font-weight: 700; color: #d0b685; letter-spacing: 2.4px; text-transform: uppercase;">
                      ADMINISTRADORA VALQUIRICO A.C.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style="padding: 36px 36px 28px 36px; background-color: #ffffff;">

              <!-- Saludo -->
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #000000;">
                Hola ${safeRecipient},
              </p>

              <!-- Introducción -->
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #374151;">
                Le hacemos llegar la convocatoria para la <strong>${safeTitle}</strong> (${escapeHtml(cleanTypeName)} &ndash; ${escapeHtml(cleanSubtypeName)}) que se llevará a cabo en el condominio.
              </p>

              <!-- Sección Detalles de Llamados -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 14px; margin-bottom: 12px;">
                <tr>
                  <td style="padding-bottom: 8px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #304854; border-bottom: 2px solid #d0b685; padding-bottom: 4px;">
                      Detalles del llamado
                    </p>
                  </td>
                </tr>
                ${callsHtml}
              </table>

              ${topicsHtml}

              <!-- Enlace a PDF si existe -->
              ${
                pdfUrl
                  ? `
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 20px 0;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(pdfUrl)}" target="_blank" style="display: inline-block; padding: 9px 20px; font-size: 12px; font-weight: 700; color: #304854; background-color: #faf8f5; border: 1px solid #d0b685; border-radius: 6px; text-decoration: none;">
                        &darr; Descargar PDF de la ${documentLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              `
                  : ""
              }

              <!-- Bloque de Instrucciones y Botón Principal -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 24px 0; background-color: #faf8f5; border: 1px solid #e2dbce; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #304854;">
                      Instrucciones para Participar y Votar:
                    </p>
                    <ol style="margin: 0 0 18px 0; padding-left: 20px; font-size: 12.5px; color: #374151; line-height: 1.6;">
                      <li style="margin-bottom: 6px;">Haga clic en el botón inferior para ingresar al portal.</li>
                      <li style="margin-bottom: 6px;">Inicie sesión con su cuenta registrada de condómino.</li>
                      <li style="margin-bottom: 6px;">Confirme su asistencia en las propiedades que representa.</li>
                      <li>Emita su voto en cada uno de los temas del orden del día.</li>
                    </ol>
                    <div align="center">
                      <a href="${safePortalUrl}" target="_blank" style="display: inline-block; padding: 13px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; font-weight: 700; color: #ffffff; background-color: #304854; text-decoration: none; border-radius: 6px; border: 1px solid #304854; box-shadow: 0 2px 8px rgba(48, 72, 84, 0.25);">
                        Acceder a la ${documentLabelCap}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Despedida -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; border-top: 1px solid #f1ece1; padding-top: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 13.5px; font-weight: 700; color: #111827;">
                      Agradecemos de antemano su puntual asistencia y participación.
                    </p>
                    <p style="margin: 0 0 4px 0; font-size: 13.5px; color: #4b5563;">
                      Saludos cordiales,
                    </p>
                    <strong style="color: #304854;">Administradora Valquirico A.C.</strong>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pie de Correo Institucional -->
          <tr>
            <td align="center" style="background-color: #304854; padding: 24px 28px 22px 28px; border-top: 2px solid #d0b685; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 2.8px; color: #ffffff; text-transform: uppercase;">
                      &#10018; INSULAE
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 9px; font-weight: 700; letter-spacing: 2px; color: #d0b685; text-transform: uppercase;">
                      SERVICIOS CONDOMINALES
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #cbd5e1;">
                      Recibió este correo porque está registrado en el sistema condominal de ${safeCondo}. Si hay un error en esta información, por favor póngase en contacto con la administración.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; color: #d0b685; text-transform: uppercase;">
                      ADMINISTRADORA VALQUIRICO A.C. &middot; RFC AVA1706221G3
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
}

