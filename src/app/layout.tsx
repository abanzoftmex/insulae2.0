import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "./app-shell";
import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getUserPermissions } from "@/shared/application/auth/permissions";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { GlobalLoader } from "@/components/global-loader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Insulae 2.0 | Sassi",
  description: "Plataforma condominal para Sassi con arquitectura hexagonal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let navbarLogoUrl: string | null = null;
  let navbarLogoAlt = "Sassi";
  const permissions = await getUserPermissions(); // Trigger recompile

  try {
    const overview = await getCondominiumOverviewUseCase.execute();
    if (overview) {
      navbarLogoUrl = overview.condominiumLogoUrl ?? overview.footerLogoUrl ?? null;
      navbarLogoAlt = overview.condominiumName || navbarLogoAlt;
    }
  } catch (error) {
    console.warn("[RootLayout] Unable to load navbar logo", error);
  }

  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans tracking-[-0.01em]" suppressHydrationWarning>
        <PermissionsProvider permissions={permissions}>
          <GlobalLoader />
          <AppShell navbarLogoUrl={navbarLogoUrl} navbarLogoAlt={navbarLogoAlt}>
            {children}
          </AppShell>
        </PermissionsProvider>
      </body>
    </html>
  );
}
