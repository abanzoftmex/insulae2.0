import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "./app-shell";
import { getCondominiumOverviewUseCase } from "@/modules/condominium";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Insulae 2.0 | Valquirico",
  description: "Plataforma condominal para Valquirico con arquitectura hexagonal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let navbarLogoUrl: string | null = null;
  let navbarLogoAlt = "Val'Quirico";

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
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans tracking-[-0.01em]" suppressHydrationWarning>
        <AppShell navbarLogoUrl={navbarLogoUrl} navbarLogoAlt={navbarLogoAlt}>{children}</AppShell>
      </body>
    </html>
  );
}
