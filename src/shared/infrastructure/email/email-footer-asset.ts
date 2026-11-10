import fs from "node:fs";
import path from "node:path";
import { EMAIL_FOOTER_LOGO_CID, resolveDefaultFooterLogoUrl } from "./email-footer";

export interface EmailFooterLogoResolution {
  footerLogoSrc: string;
  sdkAttachment: {
    filename: string;
    content: Buffer;
    contentType: string;
    contentId: string;
  } | null;
  restAttachment: {
    filename: string;
    content: string;
    content_type: string;
    content_id: string;
  } | null;
  minisitioAttachment: {
    filename: string;
    contentBase64: string;
    contentType: string;
    contentId: string;
  } | null;
}

/**
 * Resuelve la imagen del logotipo institucional para incrustarla vía CID en Resend
 * (compatible con Gmail, Outlook, Apple Mail y envíos desde localhost) y con fallback
 * a la URL pública HTTPS si el binario local no está disponible en el runtime.
 */
export function resolveFooterLogoAsset(appBaseUrl?: string): EmailFooterLogoResolution {
  const candidatePaths = [
    path.join(process.cwd(), "public", "images", "logo_insulae_light.png"),
    path.resolve("./public/images/logo_insulae_light.png"),
  ];
  let logoBuffer: Buffer | null = null;
  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      try {
        const buf = fs.readFileSync(candidatePath);
        if (buf.length > 0) {
          logoBuffer = buf;
          break;
        }
      } catch {
        logoBuffer = null;
      }
    }
  }

  if (logoBuffer) {
    const base64 = logoBuffer.toString("base64");
    return {
      footerLogoSrc: `cid:${EMAIL_FOOTER_LOGO_CID}`,
      sdkAttachment: {
        filename: "logo_insulae.png",
        content: logoBuffer,
        contentType: "image/png",
        contentId: EMAIL_FOOTER_LOGO_CID,
      },
      restAttachment: {
        filename: "logo_insulae.png",
        content: base64,
        content_type: "image/png",
        content_id: EMAIL_FOOTER_LOGO_CID,
      },
      minisitioAttachment: {
        filename: "logo_insulae.png",
        contentBase64: base64,
        contentType: "image/png",
        contentId: EMAIL_FOOTER_LOGO_CID,
      },
    };
  }

  return {
    footerLogoSrc: resolveDefaultFooterLogoUrl(appBaseUrl),
    sdkAttachment: null,
    restAttachment: null,
    minisitioAttachment: null,
  };
}
