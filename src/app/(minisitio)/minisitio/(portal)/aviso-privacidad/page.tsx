import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getPrivacyNotice, type PrivacyNotice } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { AvisoPrivacidadView } from "./aviso-privacidad-view";

export const metadata: Metadata = { title: "Aviso de Privacidad" };

/** Consulta del aviso de privacidad (antes pages/aviso-privacidad.js + /api/privacy/notice). */
export default async function AvisoPrivacidadPage() {
  await requireCondominoSession();

  let notice: PrivacyNotice = { aviso_privacidad: "", pdfAviso: null };
  let error: string | null = null;
  try {
    notice = await getPrivacyNotice();
  } catch (err) {
    console.error("[minisitio] aviso-privacidad:", err);
    error = "No se pudo cargar el aviso de privacidad";
  }

  return <AvisoPrivacidadView privacyNotice={notice.aviso_privacidad} pdfAviso={notice.pdfAviso} error={error} />;
}
