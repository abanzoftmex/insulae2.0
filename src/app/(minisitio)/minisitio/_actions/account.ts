"use server";

/**
 * Acciones de la cuenta del condómino: perfil, notificaciones paginadas, envío del estado
 * de cuenta por correo e imágenes para los PDF.
 */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getProfile, updateRequiresInvoice } from "@/modules/minisitio/infrastructure/queries/profile.queries";
import { listNotificaciones } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { getPrivacyNotice } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { getActiveProject } from "@/modules/minisitio/infrastructure/condominium";
import { MINISITIO_STATEMENT_MAIL_FROM, sendMinisitioEmail } from "@/modules/minisitio/infrastructure/mailer";
import { appOrigin } from "@/shared/infrastructure/app-origin";
import { getObject } from "@/shared/infrastructure/storage/r2";
import { absoluteFileUrl, isUsableFileUrl, storageKeyFromUrl } from "@/shared/infrastructure/storage/storage-paths";
import type { ActionResult } from "@/modules/minisitio/domain/types";

export async function getProfileAction() {
  const session = await requireCondominoSession();
  return getProfile(session);
}

export async function updateRequiresInvoiceAction(requiereFactura: boolean): Promise<ActionResult> {
  const session = await requireCondominoSession();
  if (typeof requiereFactura !== "boolean") {
    return { success: false, message: "El campo requiereFactura debe ser un valor booleano" };
  }
  try {
    await updateRequiresInvoice(session, requiereFactura);
    return { success: true, message: "Campo de requiere factura actualizado correctamente" };
  } catch (error) {
    console.error("[minisitio] updateRequiresInvoiceAction:", error);
    return { success: false, message: "Error al actualizar el perfil" };
  }
}

/**
 * La constancia fiscal la administra el personal en insulae2.0 (directorio); el minisitio
 * independiente también respondía 501 aquí.
 */
export async function uploadConstanciaFiscalAction(formData?: FormData): Promise<ActionResult> {
  await requireCondominoSession();
  void formData; // se recibe por compatibilidad con la pantalla; aún no se procesa
  return {
    success: false,
    message: "La actualización de la constancia fiscal se realiza por el administrador en insulae2.0.",
  };
}

export async function listNotificacionesAction(input: { limit?: number; offset?: number } = {}) {
  const session = await requireCondominoSession();
  return listNotificaciones(session, input);
}

/** Hosts de la 1.0 de donde aún pueden venir logos (nombres de archivo legacy). */
const ALLOWED_IMAGE_PREFIXES = ["https://sistemasabanza.com/", "https://encuesta.sistemasabanza.com/"];

/**
 * Descarga una imagen (logo del proyecto) y la devuelve como data URL, para incrustarla en
 * los PDF sin problemas de CORS. Los archivos de la app se leen directo de R2 (también las
 * URLs antiguas de Firebase, copiadas con la misma clave). Sustituye a /api/proxy-image.
 */
export async function fetchImageAsDataUrlAction(url: string): Promise<string | null> {
  await requireCondominoSession();
  if (!url) return null;
  const key = storageKeyFromUrl(url);
  if (!key && !ALLOWED_IMAGE_PREFIXES.some((prefix) => url.startsWith(prefix))) return null;
  try {
    const response = key
      ? await getObject(key)
      : await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    if (!response?.ok) return null;
    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      // Sin await: con el fetch de Next la cancelación puede no resolverse nunca.
      response.body?.cancel().catch(() => undefined);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[minisitio] fetchImageAsDataUrlAction:", error);
    return null;
  }
}

/** Quita enlaces y rompe correos/dominios del aviso para que el cliente de correo no los enlace. */
function sanitizePrivacyForEmail(avisoRaw: string): string {
  return avisoRaw
    .replace(/<a\s+[^>]*>([^<]*)<\/a>/gi, "$1")
    .replace(/<a\s+[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, (email) =>
      email.replace("@", "&#8203;@&#8203;").replace(/\./g, "&#8203;.&#8203;"),
    )
    .replace(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,})\b/gi, (domain) => (domain.includes("&#") ? domain : domain.replace(/\./g, "&#8203;.&#8203;")))
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ");
}

export interface SendStatementEmailInput {
  email: string;
  propertyName: string;
  userName: string;
  /** PDF en base64 (con o sin prefijo `data:application/pdf;base64,`). */
  pdfData: string;
}

const LEGACY_PROJECT_LOGO_BASE = "https://sistemasabanza.com/insulae/imagenes/proyectos/logo/";

/**
 * Logo del correo, resuelto en el servidor desde el proyecto (no se acepta del cliente: va
 * dentro del HTML). Los correos necesitan URLs absolutas; si no hay logo, el de Val'Quirico
 * servido por esta misma app.
 */
async function statementEmailLogoUrl(condominiumId: string): Promise<string> {
  const origin = await appOrigin();
  const logo = (await getActiveProject(condominiumId))?.condominiumLogoUrl?.trim();
  if (!logo) return `${origin}/valquirico-logo.png`;
  return isUsableFileUrl(logo) ? absoluteFileUrl(logo, origin) : `${LEGACY_PROJECT_LOGO_BASE}${logo}`;
}

/** Envía el estado de cuenta (PDF generado en el navegador) por correo con Resend. */
export async function sendAccountStatementEmailAction(input: SendStatementEmailInput): Promise<ActionResult<{ emailId: string | null }>> {
  const session = await requireCondominoSession();
  const { email, propertyName, userName, pdfData } = input || ({} as SendStatementEmailInput);
  if (!email || !propertyName || !userName || !pdfData) {
    return { success: false, message: "Missing required fields: email, propertyName, userName, pdfData" };
  }

  const pdfBase64 = pdfData.startsWith("data:application/pdf;base64,") ? pdfData.split(",")[1] : pdfData;
  const emailLogoUrl = await statementEmailLogoUrl(session.condominiumId);

  let avisoPrivacidad = "";
  try {
    const { aviso_privacidad } = await getPrivacyNotice();
    if (aviso_privacidad) avisoPrivacidad = sanitizePrivacyForEmail(aviso_privacidad);
  } catch (error) {
    console.error("[minisitio] Error al obtener aviso de privacidad:", error);
  }

  try {
    const { id } = await sendMinisitioEmail({
      from: MINISITIO_STATEMENT_MAIL_FROM,
      to: [email],
      subject: `Estado de Cuenta - ${propertyName}`,
      html: statementEmailHtml(emailLogoUrl, avisoPrivacidad),
      attachments: [
        {
          filename: `estado-cuenta-${propertyName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`,
          contentBase64: pdfBase64,
        },
      ],
    });
    return { success: true, message: "Email enviado exitosamente", emailId: id };
  } catch (error) {
    console.error("[minisitio] sendAccountStatementEmailAction:", error);
    return { success: false, message: "Error al enviar el email" };
  }
}

function statementEmailHtml(emailLogoUrl: string, avisoPrivacidad: string): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">
                  <tr>
                    <td style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 4px solid #1E3932;">
                      <img src="${emailLogoUrl.replace(/"/g, "&quot;")}" alt="Val'Quirico" style="max-width: 200px; height: auto;">
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px; background-color: #ffffff;">
                      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 30px;">
                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                          Apreciable condómino, enviamos su estado de cuenta mensual, agradecemos los pagos realizados.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                          <div style="display: inline-block; background-color: #cba258; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; font-size: 14px;">
                            Su documento se encuentra adjunto a este correo.
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #1E3932; padding: 25px 30px; text-align: center;">
                      <p style="color: #ffffff; font-size: 12px; line-height: 1.6; margin: 0 0 15px 0;">
                        Has recibido este correo porque se encuentra como contacto en nuestro sistema condominial, de haber un error favor de hacer caso omiso a este correo.
                      </p>
                      ${
                        avisoPrivacidad
                          ? `
                      <div style="color: #d1d5db; font-size: 9px; line-height: 1.4; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: justify;">
                        ${avisoPrivacidad}
                      </div>
                      `
                          : ""
                      }
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
