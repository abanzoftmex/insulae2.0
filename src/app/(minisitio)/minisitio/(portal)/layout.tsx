import { redirect } from "next/navigation";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getSessionInfo } from "@/modules/minisitio/application/auth.service";
import { getPrivacyNotice } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { getSidebarData } from "@/modules/minisitio/infrastructure/queries/sidebar.queries";
import { MinisitioSessionProvider } from "@/components/minisitio/session-provider";
import { MinisitioShell } from "@/components/minisitio/minisitio-shell";

/**
 * Pantallas con sesión del portal. El layout resuelve en el servidor los datos del
 * condómino (nombre, tipo, indicadores) y monta el shell. OJO: un layout no se vuelve a
 * ejecutar en navegaciones internas, así que cada page.tsx debe llamar también a
 * requireCondominoSession() (memorizado por petición, no repite la consulta).
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCondominoSession();
  const info = await getSessionInfo(session);
  if (!info) redirect("/minisitio/logout?reason=revoked");

  const [privacyNotice, sidebar] = await Promise.all([
    info.user.aceptoAvisoPrivacidad ? "" : getPrivacyNotice().then((p) => p.aviso_privacidad),
    getSidebarData(session),
  ]);

  return (
    <MinisitioSessionProvider session={info}>
      <MinisitioShell privacyNotice={privacyNotice} sidebar={sidebar}>
        {children}
      </MinisitioShell>
    </MinisitioSessionProvider>
  );
}
