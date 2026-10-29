import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readCondominoSession } from "@/shared/application/auth/condomino-session";
import { getSessionInfo } from "@/modules/minisitio/application/auth.service";
import { getPrivacyNotice } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { PrivacyView } from "./privacy-view";

export const metadata: Metadata = { title: "Aviso de Privacidad" };

export default async function PrivacyPage() {
  const session = await readCondominoSession();
  if (!session) redirect("/minisitio/login");

  const info = await getSessionInfo(session);
  if (!info) redirect("/minisitio/login");
  // Si el usuario ya aceptó el aviso, va al inicio (esta página es solo para aceptarlo).
  if (info.user.aceptoAvisoPrivacidad) redirect("/minisitio");

  const { aviso_privacidad } = await getPrivacyNotice();
  return <PrivacyView notice={aviso_privacidad} />;
}
