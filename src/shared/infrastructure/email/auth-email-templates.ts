/**
 * Plantillas HTML institucionales para correos de autenticación:
 * 1. Contraseña provisional (enviada desde el Directorio de usuarios).
 * 2. Recuperación / restablecimiento de contraseña.
 *
 * Sigue fielmente la línea visual institucional de Insulae 2.0 / Val'Quirico:
 * - Azul principal: #304854
 * - Dorado beige: #d0b685
 * - Negro/gris oscuro para textos: #111827 / #374151
 * - Blanco para fondos de lectura y contrastes: #ffffff
 *
 * Implementado con tablas anidadas y CSS inline para máxima compatibilidad con:
 * Gmail, Outlook (MSO), Apple Mail y clientes móviles.
 */

import { buildInstitutionalEmailFooterRowHtml } from "./email-footer";

export interface ProvisionalPasswordEmailOptions {
  recipientName: string;
  tempPassword: string;
  condominiumName?: string;
  loginUrl?: string;
  logoUrl?: string;
  appBaseUrl?: string;
  footerLogoSrc?: string;
}

export interface PasswordResetEmailOptions {
  recipientName: string;
  resetLink: string;
  condominiumName?: string;
  logoUrl?: string;
  appBaseUrl?: string;
  footerLogoSrc?: string;
  expiresInMinutes?: number;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Genera el correo para entrega de contraseña provisional (referencia exacta Imagen 2).
 */
export function buildProvisionalPasswordEmailHtml({
  recipientName,
  tempPassword,
  condominiumName = "Val'Quirico",
  loginUrl = "https://valquirico.insulae.app/login",
  logoUrl,
  appBaseUrl,
  footerLogoSrc,
}: ProvisionalPasswordEmailOptions): string {
  const safeName = escapeHtml(recipientName.trim() || "Usuario");
  const safePassword = escapeHtml(tempPassword.trim());
  const safeCondo = escapeHtml(condominiumName);
  const safeLoginUrl = escapeHtml(loginUrl);

  const resolvedLogoUrl =
    logoUrl ||
    "https://valquirico.insulae.app/brand/valquirico-logo-light.png";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contraseña provisional - Condominio ${safeCondo}</title>
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

          <!-- Cuerpo del Correo -->
          <tr>
            <td style="padding: 34px 34px 28px 34px; background-color: #ffffff; color: #1f2937;">
              
              <!-- Saludo -->
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                Hola <strong>${safeName}</strong>,
              </p>

              <!-- Texto explicativo -->
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #374151;">
                Se ha generado una contraseña provisional para tu acceso al sistema del condominio.
              </p>

              <!-- Bloque Destacado de Contraseña Provisional (Estilo Imagen 2) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 24px 0;">
                <tr>
                  <td style="background-color: #faf8f5; border-left: 4px solid #304854; border-top: 1px dashed #d0b685; border-right: 1px dashed #d0b685; border-bottom: 1px dashed #d0b685; border-radius: 4px 8px 8px 4px; padding: 18px 22px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 800; letter-spacing: 2.2px; text-transform: uppercase; color: #8a6e3e;">
                      CONTRASEÑA PROVISIONAL
                    </p>
                    <div style="font-family: 'Courier New', Courier, monospace, 'Lucida Console'; font-size: 24px; font-weight: 800; letter-spacing: 4px; color: #111827; word-break: break-all;">
                      ${safePassword}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Recomendación de seguridad -->
              <p style="margin: 0 0 22px 0; font-size: 13.5px; line-height: 1.6; color: #4b5563;">
                Por motivos de seguridad, te recomendamos iniciar sesión con esta contraseña y cambiarla inmediatamente desde tu perfil de usuario.
              </p>

              <!-- Botón de Acción Principal -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 10px 0 26px 0;">
                <tr>
                  <td align="left" style="border-radius: 6px; background-color: #304854;">
                    <a href="${safeLoginUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px; border: 1px solid #304854;">
                      Iniciar sesión &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Firma y despedida -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f0eae1; padding-top: 18px; margin-top: 10px;">
                <tr>
                  <td style="font-size: 13.5px; line-height: 1.5; color: #374151;">
                    Saludos cordiales,<br />
                    <strong style="color: #304854;">Administradora Valquirico A.C.</strong>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${buildInstitutionalEmailFooterRowHtml({
            footerLogoSrc,
            appBaseUrl,
            noticeText: `Recibió este correo porque está registrado en el sistema condominal de ${condominiumName}. Si hay un error en esta información o no solicitó este cambio, por favor póngase en contacto con la administración.`,
          })}

        </table>
        <!-- Fin Tarjeta Central -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Genera el correo de recuperación / restablecimiento de contraseña.
 * Aplica con exactitud la composición, paleta y elementos de la Imagen 2.
 */
export function buildPasswordResetEmailHtml({
  recipientName,
  resetLink,
  condominiumName = "Val'Quirico",
  logoUrl,
  appBaseUrl,
  footerLogoSrc,
  expiresInMinutes = 60,
}: PasswordResetEmailOptions): string {
  const safeName = escapeHtml(recipientName.trim() || "Usuario");
  const safeLink = escapeHtml(resetLink);
  const safeCondo = escapeHtml(condominiumName);
  const hours = Math.round(expiresInMinutes / 60) || 1;

  const resolvedLogoUrl =
    logoUrl ||
    "https://valquirico.insulae.app/brand/valquirico-logo-light.png";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablecer contraseña - Condominio ${safeCondo}</title>
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

          <!-- Cuerpo del Correo -->
          <tr>
            <td style="padding: 34px 34px 28px 34px; background-color: #ffffff; color: #1f2937;">
              
              <!-- Saludo -->
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                Hola <strong>${safeName}</strong>,
              </p>

              <!-- Texto explicativo -->
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #374151;">
                Recibimos una solicitud para restablecer la contraseña de acceso a tu cuenta en el sistema condominal.
              </p>

              <!-- Bloque Destacado de Instrucción (Estilo Imagen 2) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 24px 0;">
                <tr>
                  <td style="background-color: #faf8f5; border-left: 4px solid #304854; border-top: 1px dashed #d0b685; border-right: 1px dashed #d0b685; border-bottom: 1px dashed #d0b685; border-radius: 4px 8px 8px 4px; padding: 18px 22px; text-align: left;">
                    <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #8a6e3e;">
                      SOLICITUD DE RECUPERACIÓN
                    </p>
                    <p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: #374151;">
                      Para definir una nueva contraseña y recuperar tu acceso, haz clic en el siguiente botón:
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botón de Acción Principal -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 10px 0 24px 0;">
                <tr>
                  <td align="left" style="border-radius: 6px; background-color: #304854;">
                    <a href="${safeLink}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px; border: 1px solid #304854;">
                      Restablecer contraseña &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Enlace alternativo si el botón no abre -->
              <p style="margin: 0 0 8px 0; font-size: 12.5px; line-height: 1.5; color: #6b7280;">
                O copia y pega el siguiente enlace directo en tu navegador:
              </p>
              <p style="margin: 0 0 22px 0; font-size: 12px; line-height: 1.5; word-break: break-all; color: #304854;">
                <a href="${safeLink}" target="_blank" style="color: #304854; text-decoration: underline;">${safeLink}</a>
              </p>

              <!-- Aviso de seguridad y vigencia -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 0 0 24px 0;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569;">
                  <strong>Aviso de seguridad:</strong> Este enlace tiene una vigencia de <strong>${hours} hora${hours > 1 ? "s" : ""}</strong>. Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña actual continuará protegida.
                </p>
              </div>

              <!-- Firma y despedida -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f0eae1; padding-top: 18px; margin-top: 10px;">
                <tr>
                  <td style="font-size: 13.5px; line-height: 1.5; color: #374151;">
                    Saludos cordiales,<br />
                    <strong style="color: #304854;">Administradora Valquirico A.C.</strong>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${buildInstitutionalEmailFooterRowHtml({
            footerLogoSrc,
            appBaseUrl,
            noticeText: `Recibió este correo porque está registrado en el sistema condominal de ${condominiumName}. Si hay un error en esta información o no solicitó este cambio, por favor póngase en contacto con la administración.`,
          })}

        </table>
        <!-- Fin Tarjeta Central -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

