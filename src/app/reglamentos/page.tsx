import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { getRegulationDirectoryUseCase } from "@/modules/regulations";
import { toRegulationDirectoryVM } from "@/modules/regulations/presentation/regulation-directory.vm";

import { ReglamentosWorkbench } from "./reglamentos-workbench";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-reglamentos-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-reglamentos-body",
});

export const metadata: Metadata = {
  title: "Reglamentos | Insulae 2.0",
  description:
    "Vista modernizada de formulario_reglamentos.php con estructura hexagonal y persistencia en Neon.",
};

export const dynamic = "force-dynamic";

export default async function ReglamentosPage() {
  const directory = await getRegulationDirectoryUseCase.execute();
  const vm = directory ? toRegulationDirectoryVM(directory) : null;

  return (
    <main
      className={`${cormorant.variable} ${manrope.variable} relative isolate min-h-screen overflow-hidden bg-[#f4ece0] px-5 pb-16 pt-8 text-[#231912] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#b36f46]/16 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[20rem] rounded-full bg-[#466c7d]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.42),transparent_40%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-[#bfa283]/40 bg-[#fff7ea]/80 p-6 shadow-[0_15px_50px_rgba(64,37,19,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#8f593b]/30 bg-[#8f593b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e3e26]">
              Modulo Reglamentos
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/reporte-condominio"
                className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
              >
                Ir a Reporte
              </Link>
              <Link
                href="/condominio"
                className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
              >
                Ir a Condominio
              </Link>
              <Link
                href="/contactos"
                className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
              >
                Ir a Contactos
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h1 className="font-[var(--font-reglamentos-display)] text-4xl leading-none text-[#2e221c] sm:text-5xl">
                Reglamentos y Documentos
              </h1>
              <p className="max-w-2xl font-[var(--font-reglamentos-body)] text-sm leading-relaxed text-[#5d4f46] sm:text-base">
                Reemplazo directo de formulario_reglamentos.php: listado de documentos por
                proyecto, tipo reglamento/documento interno, carga de PDF, edicion y baja logica.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d0b094] bg-[#2e221c] p-5 text-[#f5e8d7]">
              <p className="font-[var(--font-reglamentos-body)] text-xs uppercase tracking-[0.2em] text-[#e7c8a7]">
                Resumen
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Total</p>
                  <p className="mt-1 font-[var(--font-reglamentos-display)] text-3xl leading-none">
                    {vm?.totalDocuments ?? "0"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Regl.</p>
                  <p className="mt-1 font-[var(--font-reglamentos-display)] text-3xl leading-none">
                    {vm?.totalRegulations ?? "0"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Internos</p>
                  <p className="mt-1 font-[var(--font-reglamentos-display)] text-3xl leading-none">
                    {vm?.totalInternalDocuments ?? "0"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#f3dcc5]/90">Proyecto: {vm?.projectName ?? "Sin proyecto activo"}</p>
            </div>
          </div>
        </header>

        {vm ? (
          <ReglamentosWorkbench directory={vm} />
        ) : (
          <section className="rounded-2xl border border-[#c8ad95] bg-[#fff8ef] p-6 text-center">
            <h2 className="font-[var(--font-reglamentos-display)] text-3xl text-[#2f221a]">
              Sin condominio/proyecto activo
            </h2>
            <p className="mt-2 font-[var(--font-reglamentos-body)] text-sm text-[#68584c]">
              No se encontro un proyecto activo para desplegar reglamentos.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
