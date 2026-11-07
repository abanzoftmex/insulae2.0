import { formatCurrency } from "./private-area-action-routing";

export interface StatementEmailTemplateProps {
  condominiumName: string;
  areaName: string;
  displayM2: number;
  recipientName: string;
  totalBalance: number;
  totalInterests?: number;
  responsibilityLabel: string;
  formattedCutDate: string;
  pdfFilename: string;
  appBaseUrl?: string;
  logoSrc?: string;
}

/**
 * Genera el cuerpo de correo HTML institucional para el envío de estados de cuenta.
 * Diseñado conforme a las mejores prácticas de correo electrónico (tablas anidadas,
 * CSS en línea, compatible con Gmail, Outlook, Apple Mail y dispositivos móviles).
 * Sigue la línea gráfica ejecutiva de Val'Quirico (azul marino #111e38, dorado #dfb76c y fondo crema).
 * Soporta incrustación directa CID ('cid:valquirico-logo') o URL remota del logotipo.
 */
export function buildStatementEmailHtml({
  condominiumName,
  areaName,
  displayM2,
  recipientName,
  totalBalance,
  totalInterests = 0,
  responsibilityLabel,
  formattedCutDate,
  pdfFilename,
  appBaseUrl = "",
  logoSrc,
}: StatementEmailTemplateProps): string {
  const isDebtPositive = totalBalance > 0.005;
  const resolvedLogoSrc =
    logoSrc !== undefined
      ? logoSrc
      : appBaseUrl && appBaseUrl.startsWith("https://")
        ? `${appBaseUrl.replace(/\/$/, "")}/brand/valquirico-logo-light.png`
        : "cid:valquirico-logo";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Estado de cuenta - ${areaName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4efe8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Outer Table Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4efe8; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 12px 40px 12px;">

        <!-- Main Card Container (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5dccf; box-shadow: 0 4px 18px rgba(17, 30, 56, 0.08);">
          
          <!-- Top Executive Header Banner -->
          <tr>
            <td align="center" style="background-color: #111e38; background: linear-gradient(135deg, #111e38 0%, #15284f 100%); padding: 30px 24px 26px 24px; border-bottom: 3px solid #dfb76c;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                ${
                  resolvedLogoSrc
                    ? `<tr>
                  <td align="center" style="padding: 0 0 8px 0;">
                    <img src="${resolvedLogoSrc}" alt="Val'Quirico" width="210" style="display: block; max-width: 210px; width: 100%; height: auto; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 9.5px; font-weight: 700; color: #dfb76c; letter-spacing: 2.2px; text-transform: uppercase;">
                      ADMINISTRADORA VALQUIRICO A.C.
                    </p>
                  </td>
                </tr>`
                    : `<tr>
                  <td align="center" style="padding: 0;">
                    <h2 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 21px; font-weight: 700; color: #dfb76c; letter-spacing: 3px; text-transform: uppercase;">
                      VAL'QUIRICO
                    </h2>
                    <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 600; color: #e2e8f0; letter-spacing: 1.8px; text-transform: uppercase;">
                      ADMINISTRADORA VALQUIRICO A.C.
                    </p>
                  </td>
                </tr>`
                }
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 34px 32px 28px 32px; background-color: #ffffff;">

              <!-- Overline Badge & Title -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 0;">
                    <p style="margin: 0 0 4px 0; font-size: 10.5px; font-weight: 800; letter-spacing: 2px; color: #b8860b; text-transform: uppercase;">
                      ESTADO DE CUENTA
                    </p>
                    <h1 style="margin: 0 0 6px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.25; font-weight: 700; color: #111e38;">
                      Condominio ${condominiumName}
                    </h1>
                    <p style="margin: 0; font-size: 12.5px; color: #64748b; font-weight: 500;">
                      Fecha de corte: <strong style="color: #334155;">${formattedCutDate}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Salutation and Greeting -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 22px;">
                <tr>
                  <td style="padding: 0; font-size: 14px; line-height: 1.6; color: #334155;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #111e38;">
                      Estimado(a) ${recipientName}:
                    </p>
                    <p style="margin: 0;">
                      Le compartimos su estado de cuenta correspondiente al área privativa <strong style="color: #111e38;">${areaName}</strong>. Encontrará el desglose completo de cargos, cuotas aplicadas, historial de pagos y referencias bancarias en el archivo PDF adjunto a este correo.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Property & Balance Summary Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fbf9f5; border: 1px solid #ebdccb; border-radius: 10px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <!-- Left Spec: Área Privativa -->
                  <td width="50%" style="padding: 14px 18px; border-bottom: 1px solid #eee5d8; border-right: 1px solid #eee5d8; vertical-align: top;">
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #8c734b; display: block; margin-bottom: 2px;">
                      Área Privativa
                    </span>
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 17px; font-weight: 800; color: #111e38;">
                      ${areaName}
                    </span>
                  </td>
                  <!-- Right Spec: Superficie -->
                  <td width="50%" align="right" style="padding: 14px 18px; border-bottom: 1px solid #eee5d8; vertical-align: top;">
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #8c734b; display: block; margin-bottom: 2px;">
                      Superficie
                    </span>
                    <span style="font-size: 14px; font-weight: 700; color: #111e38;">
                      ${displayM2.toFixed(2)} m²
                    </span>
                  </td>
                </tr>
                <tr>
                  <!-- Left Spec: Adeudo al día -->
                  <td width="50%" style="padding: 14px 18px; border-right: 1px solid #eee5d8; vertical-align: top;">
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; display: block; margin-bottom: 2px;">
                      Adeudo al día
                    </span>
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 19px; font-weight: 800; color: ${
                      isDebtPositive ? "#8b1e0f" : "#166534"
                    };">
                      ${formatCurrency(totalBalance)}
                    </span>
                    ${
                      totalInterests > 0
                        ? `<span style="font-size: 9.5px; color: #8c734b; display: block; margin-top: 2px;">Incluye intereses moratorios</span>`
                        : ""
                    }
                  </td>
                  <!-- Right Spec: Responsabilidad -->
                  <td width="50%" align="right" style="padding: 14px 18px; vertical-align: top;">
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; display: block; margin-bottom: 2px;">
                      Responsabilidad
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1e3a8a; background-color: #e0ecff; border: 1px solid #c7dbff; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                      ${responsibilityLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- PDF Attachment Notice Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111e38; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="font-size: 13.5px; font-weight: 700; color: #dfb76c; letter-spacing: 0.3px;">
                          &#128206; Archivo PDF adjunto: <span style="color: #ffffff;">${pdfFilename}</span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-size: 11px; color: #cbd5e1; padding-top: 4px;">
                          Abra o descargue el archivo adjunto para revisar el desglose pormenorizado y las cuentas para pago.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider Line -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 22px;">
                <tr>
                  <td style="border-top: 1px solid #e5dfd5; padding: 0;"></td>
                </tr>
              </table>

              <!-- Support and Inquiries -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 12.5px; line-height: 1.55; color: #64748b; padding: 0 0 16px 0;">
                    Si tiene alguna duda sobre sus cargos, aclaraciones o requiere notificar su comprobante de pago, responda directamente a este correo o comuníquese a <a href="mailto:finanzas@valquirico.com" style="color: #111e38; font-weight: 700; text-decoration: underline;">finanzas@valquirico.com</a>.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #1e293b;">
                    Atentamente,<br />
                    <strong style="color: #111e38;">Administración del Condominio ${condominiumName}</strong>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Information Banner -->
          <tr>
            <td align="center" style="background-color: #111e38; padding: 22px 24px; border-top: 1px solid #1e3568;">
              <p style="margin: 0 0 6px 0; font-size: 10.5px; font-weight: 800; letter-spacing: 2px; color: #dfb76c; text-transform: uppercase;">
                INSULAE &middot; SERVICIOS CONDOMINALES
              </p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Este es un correo institucional generado por la administración del condominio.
              </p>
              <p style="margin: 0; font-size: 10px; color: #64748b; line-height: 1.4;">
                Por favor no comparta este mensaje: contiene información confidencial de su área privativa.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

