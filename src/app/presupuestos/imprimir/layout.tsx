import React from "react";

/**
 * Layout aislado para la vista de impresión de presupuesto.
 * No hereda el AppShell (sidebar, navbar) del layout raíz.
 */
export default function BudgetPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

            *, *::before, *::after { box-sizing: border-box; }

            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
              color: #1f2937;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }

            @media print {
              .no-print { display: none !important; }
              .page-break { page-break-before: always; break-before: page; }
              .avoid-break { page-break-inside: avoid; break-inside: avoid; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }

            @media screen {
              body { background: #f3f4f6; }
              .print-root { 
                max-width: 960px; 
                margin: 0 auto; 
                background: #fff;
                min-height: 100vh;
                box-shadow: 0 0 40px rgba(0,0,0,0.1);
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
