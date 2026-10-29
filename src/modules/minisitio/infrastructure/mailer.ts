/**
 * Envío de correos del portal (Resend vía API REST, igual que el panel administrativo).
 *
 * Salvaguarda de desarrollo: fuera de producción NO se envía nada salvo que se defina
 * MINISITIO_SEND_EMAILS=1; el correo se registra en el log del servidor. Así probar el
 * portal en local contra la base real no le escribe a condóminos reales.
 */

export const MINISITIO_MAIL_FROM = "Val'Quirico <finanzas@info.valquirico.com>";
export const MINISITIO_STATEMENT_MAIL_FROM = "Val'Quirico Estado de Cuenta <finanzas@info.valquirico.com>";

export interface MinisitioEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; contentBase64: string }[];
}

export async function sendMinisitioEmail(email: MinisitioEmail): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const sendingEnabled = process.env.NODE_ENV === "production" || process.env.MINISITIO_SEND_EMAILS === "1";

  if (!apiKey || !sendingEnabled) {
    console.warn(
      `[minisitio-mail] Envío omitido (${!apiKey ? "sin RESEND_API_KEY" : "desarrollo; define MINISITIO_SEND_EMAILS=1 para enviar"}). ` +
        `Para: ${email.to.join(", ")} · Asunto: ${email.subject}` +
        (email.attachments?.length ? ` · Adjuntos: ${email.attachments.map((a) => a.filename).join(", ")}` : ""),
    );
    return { id: null };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.contentBase64 })),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend respondió ${response.status}: ${detail}`);
  }
  const data = (await response.json().catch(() => null)) as { id?: string } | null;
  return { id: data?.id ?? null };
}
