import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./minisitio.css";
import { readSuperadminSession } from "@/shared/application/auth/superadmin-session";
import { readCondominoSession } from "@/shared/application/auth/condomino-session";
import { getSessionInfo } from "@/modules/minisitio/application/auth.service";
import { SuperAdminBubble } from "@/components/minisitio/superadmin-bubble";

// La misma fuente y configuración que el panel (admin/layout.tsx): un solo producto y
// ninguna descarga nueva en el build.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portal del condómino | Val'Quirico",
    // Igual que el título que pone el shell: "Avisos | Val'Quirico" (como "canal | espacio" en Slack).
    template: "%s | Val'Quirico",
  },
  description: "Portal de condóminos, propietarios y residentes de Val'Quirico.",
};

/**
 * Layout raíz del portal de condóminos (`/minisitio`). Es un root layout propio: no hereda
 * el AppShell, los permisos ni los estilos del panel administrativo (route group `(admin)`).
 * Navegar entre ambos hace una carga completa de página.
 */
export default async function MinisitioRootLayout({ children }: { children: React.ReactNode }) {
  // Burbuja de superadmin: visible en todo el portal mientras el modo esté activo.
  const superadmin = await readSuperadminSession();
  let impersonatedUser = null;
  if (superadmin) {
    const condomino = await readCondominoSession();
    impersonatedUser = condomino ? ((await getSessionInfo(condomino))?.user ?? null) : null;
  }

  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        {superadmin && <SuperAdminBubble expiresAt={superadmin.expiresAt} impersonatedUser={impersonatedUser} />}
      </body>
    </html>
  );
}
