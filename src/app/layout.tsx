import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "./app-shell";
import { getCondominiumOverviewUseCase } from "@/modules/condominium";
import { getUserPermissions, readAdminSession } from "@/shared/application/auth/permissions";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { GlobalLoader } from "@/components/global-loader";
import { Suspense } from "react";

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
            
            {/* Botón Flotante de WhatsApp Global */}
            <a
              href="https://wa.me/5212212721794?text=Hola,%20necesito%20ayuda"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-medium text-sm group"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.511 0 9.992-4.479 9.995-9.996.002-2.653-1.03-5.146-2.908-7.027-1.879-1.881-4.38-2.916-7.037-2.917-5.517 0-10.002 4.48-10.004 9.997-.001 1.714.453 3.39 1.317 4.877L.888 22.09l4.57-1.196c1.472.852 3.023 1.26 4.706 1.26zm10.743-7.466c-.294-.148-1.743-.86-2.012-.958-.269-.098-.465-.148-.66.148-.196.297-.76.958-.93 1.156-.172.196-.343.22-.637.072-.295-.148-1.246-.459-2.373-1.464-.877-.782-1.47-1.747-1.642-2.043-.172-.296-.018-.456.13-.603.133-.132.294-.344.44-.516.148-.171.197-.294.295-.49.098-.197.05-.37-.024-.517-.074-.148-.66-1.592-.906-2.18-.24-.578-.484-.5-.66-.51-.171-.007-.366-.009-.561-.009-.195 0-.514.073-.783.37-.269.296-1.027 1.006-1.027 2.454 0 1.448 1.054 2.846 1.202 3.043.147.197 2.074 3.167 5.025 4.443.702.303 1.25.485 1.678.62.705.224 1.348.193 1.856.117.566-.084 1.743-.712 1.988-1.4.246-.688.246-1.277.172-1.4-.074-.124-.27-.197-.565-.346z" />
              </svg>
              <span>Ayuda</span>
            </a>
          </AppShell>
        </PermissionsProvider>
      </body>
    </html>
  );
}
