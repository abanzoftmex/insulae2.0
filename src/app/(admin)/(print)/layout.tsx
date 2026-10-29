import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presupuesto | Impresión",
};

/**
 * Layout raíz aislado para páginas de impresión/PDF.
 * Este layout NO hereda el RootLayout principal (AppShell, sidebar, navbar).
 * Al estar dentro del route group (print), reemplaza completamente el layout raíz
 * para todas las rutas de este grupo.
 */
export default function PrintRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            *, *::before, *::after { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
              color: #1f2937;
              background: #f3f4f6;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            @media print {
              body {
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; break-before: page; }
              .avoid-break { page-break-inside: avoid; break-inside: avoid; }
            }
            @media screen {
              .print-root {
                max-width: 970px;
                margin: 0 auto;
                background: #fff;
                min-height: 100vh;
                box-shadow: 0 4px 60px rgba(0,0,0,0.12);
              }
            }
          `
        }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
