import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { AppShell } from "./app-shell";
import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getUserPermissions, readAdminSession } from "@/shared/application/auth/permissions";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { GlobalLoader } from "@/components/global-loader";
import { WhatsAppFloatingButton } from "@/components/whatsapp-floating-button";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Insulae 2.0",
    template: "%s | Insulae 2.0",
  },
  description: "Plataforma condominal para Valquirico con arquitectura hexagonal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let navbarLogoUrl: string | null = "/valquirico-logo.png";
  let navbarLogoAlt = "Val'Quirico";
  const permissions = await getUserPermissions(); // Trigger recompile

  const session = await readAdminSession();
  const currentUserName = session?.name || "Usuario Insulae";

  try {
    const overview = await getCondominiumOverviewUseCase.execute();
    if (overview) {
      const rawLogo = overview.condominiumLogoUrl ?? overview.footerLogoUrl;
      const isDelinquentRemote = rawLogo && (rawLogo.includes("storage.googleapis.com") || rawLogo.includes("firebasestorage.googleapis.com"));
      navbarLogoUrl = (!isDelinquentRemote && rawLogo) ? rawLogo : "/valquirico-logo.png";
      navbarLogoAlt = overview.condominiumName || "Val'Quirico";
    }
  } catch (error) {
    console.warn("[RootLayout] Unable to load navbar logo", error);
  }

  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans tracking-[-0.01em]" suppressHydrationWarning>
        <PermissionsProvider permissions={permissions}>
          <Suspense fallback={null}>
            <GlobalLoader />
          </Suspense>
          <AppShell navbarLogoUrl={navbarLogoUrl} navbarLogoAlt={navbarLogoAlt} currentUserName={currentUserName}>
            {children}

            <WhatsAppFloatingButton />
          </AppShell>
        </PermissionsProvider>
      </body>
    </html>
  );
}
