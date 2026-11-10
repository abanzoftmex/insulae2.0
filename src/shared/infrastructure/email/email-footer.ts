/**
 * Constructor HTML puro del pie de correo institucional de Insulae 2.0.
 *
 * Mantiene el pie compartido en fondo azul marino (#304854) con acento dorado (#d0b685),
 * logotipo oficial de INSULAE en blanco, aviso informativo y pie legal de Administradora Valquirico A.C.
 */

export const EMAIL_FOOTER_LOGO_CID = "insulae-footer-logo";
const DEFAULT_FOOTER_LOGO_BASE_URL = "https://valquirico.insulae.app";

export function escapeEmailFooterHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resolveDefaultFooterLogoUrl(appBaseUrl?: string): string {
  const normalizedBase =
    appBaseUrl && /^https?:\/\//i.test(appBaseUrl.trim())
      ? appBaseUrl.trim().replace(/\/$/, "")
      : DEFAULT_FOOTER_LOGO_BASE_URL;
  return `${normalizedBase}/images/logo_insulae_light.png`;
}

export interface InstitutionalEmailFooterOptions {
  footerLogoSrc?: string;
  appBaseUrl?: string;
  noticeText: string;
  extraHtml?: string;
}

/**
 * Genera la fila `<tr>...</tr>` del pie institucional lista para insertarse dentro
 * de la tabla principal (`max-width: 600px`) de cualquier correo HTML.
 */
export function buildInstitutionalEmailFooterRowHtml({
  footerLogoSrc,
  appBaseUrl,
  noticeText,
  extraHtml = "",
}: InstitutionalEmailFooterOptions): string {
  const safeLogoSrc = escapeEmailFooterHtml(
    footerLogoSrc?.trim() || resolveDefaultFooterLogoUrl(appBaseUrl),
  );
  const safeNotice = escapeEmailFooterHtml(noticeText);

  return `
          <!-- Pie de Correo Institucional -->
          <tr>
            <td align="center" style="background-color: #304854; padding: 24px 28px 22px 28px; border-top: 2px solid #d0b685; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <img src="${safeLogoSrc}" alt="INSULAE Gestión Condominal" width="168" style="display: block; width: 168px; max-width: 100%; height: auto; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #cbd5e1;">
                      ${safeNotice}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; color: #d0b685; text-transform: uppercase;">
                      ADMINISTRADORA VALQUIRICO A.C. <span style="color: #cbd5e1;">&middot; RFC AVA1706221G3</span>
                    </p>
                  </td>
                </tr>${
                  extraHtml
                    ? `
                <tr>
                  <td align="left" style="padding-top: 14px;">
                    ${extraHtml}
                  </td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>`;
}

