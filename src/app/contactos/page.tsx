import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { getContactDirectoryUseCase } from "@/modules/contacts";
import { toContactDirectoryVM } from "@/modules/contacts/presentation/contact-directory.vm";

import { ContactosWorkbench } from "./contactos-workbench";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-contact-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-contact-body",
});

export const metadata: Metadata = {
  title: "Contactos | Insulae 2.0",
  description: "Vista modernizada del formulario legacy de contactos con experiencia tipo board.",
};

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const directory = await getContactDirectoryUseCase.execute();
  const vm = directory ? toContactDirectoryVM(directory) : null;

  return (
    <main className={`${cormorant.variable} ${manrope.variable} relative isolate min-h-screen overflow-hidden bg-[#f3eadc] px-5 pb-16 pt-8 text-[#231912] sm:px-8 lg:px-12`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#b36f46]/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[20rem] rounded-full bg-[#5c7a56]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.45),transparent_40%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-[#bfa283]/40 bg-[#fff7ea]/80 p-6 shadow-[0_15px_50px_rgba(64,37,19,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#8f593b]/30 bg-[#8f593b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e3e26]">
              Modulo Contactos
            </span>
            <Link
              href="/condominio"
              className="rounded-full border border-[#1f1a17]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f1a17] transition hover:border-[#1f1a17] hover:bg-[#1f1a17] hover:text-[#fffaf1]"
            >
              Ir a Condominio
            </Link>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h1 className="font-[var(--font-contact-display)] text-4xl leading-none text-[#2e221c] sm:text-5xl">
                Contactos
              </h1>
              <p className="max-w-2xl font-[var(--font-contact-body)] text-sm leading-relaxed text-[#5d4f46] sm:text-base">
                Migramos el legacy <strong>formulario_contacto.php</strong> a una experiencia visual
                tipo board: alta rapida, filtros por tipo, edicion inline y baja logica sin perder
                el modelo original de datos.
              </p>
            </div>

            <div className="rounded-3xl border border-[#d0b094] bg-[#2e221c] p-5 text-[#f5e8d7]">
              <p className="font-[var(--font-contact-body)] text-xs uppercase tracking-[0.2em] text-[#e7c8a7]">
                Resumen
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Contactos</p>
                  <p className="mt-1 font-[var(--font-contact-display)] text-3xl leading-none">
                    {vm?.totalContacts ?? "0"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e2c2a4]/35 bg-[#3c2b23] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#e7c8a7]">Tipos</p>
                  <p className="mt-1 font-[var(--font-contact-display)] text-3xl leading-none">
                    {vm?.totalTypes ?? "0"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {vm ? (
          <ContactosWorkbench entries={vm.entries} types={vm.types} />
        ) : (
          <section className="rounded-2xl border border-[#c8ad95] bg-[#fff8ef] p-6 text-center">
            <h2 className="font-[var(--font-contact-display)] text-3xl text-[#2f221a]">
              Sin condominio activo
            </h2>
            <p className="mt-2 font-[var(--font-contact-body)] text-sm text-[#68584c]">
              No se encontro un condominio activo para desplegar contactos.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
