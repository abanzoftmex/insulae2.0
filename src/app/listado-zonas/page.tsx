import type { Metadata } from "next";
import Link from "next/link";
import { Lora, Nunito_Sans } from "next/font/google";

import { getZoneListingUseCase } from "@/modules/zones";
import { toZoneListingVM } from "@/modules/zones/presentation/zone-listing.vm";

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-zones-display",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-zones-body",
});

export const metadata: Metadata = {
  title: "Barrios | Insulae 2.0",
  description: "Listado de barrios (zonas) alimentado desde Neon con arquitectura hexagonal.",
};

export const dynamic = "force-dynamic";

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M9.25 3.25a.75.75 0 0 1 1.5 0v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M4 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0m4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0m6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M13.59 2.59a2 2 0 0 1 2.82 0l1 1a2 2 0 0 1 0 2.82l-8.66 8.66a2 2 0 0 1-.9.52l-3.2.91a.75.75 0 0 1-.93-.93l.91-3.2a2 2 0 0 1 .52-.9zm1.76 1.06-1.1 1.1 1.99 1.99 1.1-1.1a.5.5 0 0 0 0-.7l-1-1a.5.5 0 0 0-.7 0M7.27 13.83l5.92-5.92 1.99 1.99-5.92 5.92a.5.5 0 0 1-.23.13l-2.24.64.64-2.24a.5.5 0 0 1 .13-.23" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M8 2.75A1.75 1.75 0 0 0 6.25 4.5v.25H4a.75.75 0 0 0 0 1.5h.46l.8 9.2A2 2 0 0 0 7.25 17.5h5.5a2 2 0 0 0 1.99-2.05l.8-9.2H16a.75.75 0 0 0 0-1.5h-2.25V4.5A1.75 1.75 0 0 0 12 2.75zm1.5 2V4.5a.25.25 0 0 1 .25-.25H12a.25.25 0 0 1 .25.25v.25zM8 8a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 8 8m4 .75a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0z" />
    </svg>
  );
}

export default async function ListadoZonasPage() {
  const listing = await getZoneListingUseCase.execute();
  const vm = listing ? toZoneListingVM(listing) : null;

  if (!vm) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-6 py-20">
        <section className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Barrios</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">Sin datos disponibles</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            No se encontro un condominio activo para consultar los barrios.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full border border-[#2b211d]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b211d] transition hover:border-[#2b211d] hover:bg-[#2b211d] hover:text-[#fff7ec]"
          >
            Volver al Inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`${lora.variable} ${nunito.variable} relative isolate min-h-screen overflow-hidden bg-[#f2ede2] px-5 pb-14 pt-8 text-[#1f1713] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-7rem] h-[22rem] w-[24rem] rounded-full bg-[#8b5238]/16 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[24rem] rounded-full bg-[#43695a]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_34%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <header className="rounded-[2rem] border border-[#bea486]/45 bg-[linear-gradient(130deg,rgba(255,248,236,0.94)_0%,rgba(250,239,225,0.92)_62%,rgba(236,223,206,0.9)_100%)] p-6 shadow-[0_22px_50px_rgba(43,27,17,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#7b4f38]/35 bg-[#7b4f38]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#73452e]">
              Master Data
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/listado-zonas/nuevo"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#4f8a53] bg-[linear-gradient(160deg,#6cb45f_0%,#4f8a53_100%)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_20px_rgba(66,120,66,0.28)] transition hover:brightness-110"
                title="Crear barrio"
              >
                <PlusIcon />
                Nuevo barrio
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4bfab] bg-white/90 text-[#6f5949] shadow-[0_8px_16px_rgba(46,32,24,0.1)] transition hover:bg-[#fff4e7]"
                aria-label="Mas acciones"
                title="Mas acciones disponibles en la siguiente iteracion"
              >
                <DotsIcon />
              </button>
            </div>
          </div>

          <h1 className="mt-4 font-[var(--font-zones-display)] text-4xl leading-none text-[#2c2019] sm:text-5xl">
            Barrios
          </h1>
          <p className="mt-3 max-w-4xl font-[var(--font-zones-body)] text-sm leading-relaxed text-[#5a4b40] sm:text-base">
            Listado de barrios obtenido de la base Neon para <strong>{vm.condominiumName}</strong>.
          </p>
        </header>

        <section className="rounded-3xl border border-[#bea993]/45 bg-white/62 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfb8a2]/70 pb-3">
            <h2 className="font-[var(--font-zones-display)] text-2xl leading-none text-[#2b1f18] sm:text-3xl">
              Listado de barrios
            </h2>
            <p className="text-xs uppercase tracking-[0.14em] text-[#7e5741]">
              {vm.totalZones} registros activos
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[#d2c0ad] bg-[#fff8ee]">
            <table className="min-w-[800px] w-full table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[#d8c6b2] bg-[#d7dde8] px-4 py-3 text-left font-semibold text-[#2e241e]">
                    Nombre
                  </th>
                  <th className="border-b border-l border-[#d8c6b2] bg-[#d7dde8] px-4 py-3 text-left font-semibold text-[#2e241e]">
                    Iniciales
                  </th>
                  <th className="border-b border-l border-[#d8c6b2] bg-[#d7dde8] px-4 py-3 text-left font-semibold text-[#2e241e]">
                    Subzonas activas
                  </th>
                  <th className="border-b border-l border-[#d8c6b2] bg-[#cfd9e8] px-4 py-3 text-center font-semibold text-[#2e241e]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {vm.rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#fff2de]/65">
                    <td className="border-b border-[#d8c6b2] px-4 py-3 font-semibold text-[#2f241d]">
                      {row.name}
                    </td>
                    <td className="border-b border-l border-[#d8c6b2] px-4 py-3 text-[#3d3028]">
                      <span className="inline-flex rounded-md border border-[#cfb79f] bg-[#f4e8da] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-[#6b4e3b]">
                        {row.initials}
                      </span>
                    </td>
                    <td className="border-b border-l border-[#d8c6b2] px-4 py-3 text-[#3d3028]">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.canDelete
                            ? "bg-[#e9f4e7] text-[#2f6b3f]"
                            : "bg-[#efe7de] text-[#5e4a3f]"
                        }`}
                      >
                        {row.activeSubzones}
                      </span>
                    </td>
                    <td className="border-b border-l border-[#d8c6b2] px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/listado-zonas/${row.id}/editar`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#b68f42] bg-[linear-gradient(160deg,#caa64d_0%,#ab7f2f_100%)] text-white shadow-[0_8px_14px_rgba(122,90,32,0.25)] transition hover:scale-[1.03]"
                          title="Editar barrio"
                          aria-label={`Editar ${row.name}`}
                        >
                          <PencilIcon />
                        </Link>
                        {row.canDelete ? (
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c06143] bg-[linear-gradient(160deg,#db7b57_0%,#b24a31_100%)] text-white shadow-[0_8px_14px_rgba(133,58,39,0.24)] transition hover:scale-[1.03]"
                            title="Eliminacion de barrio en la siguiente iteracion"
                            aria-label={`Eliminar ${row.name}`}
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-[#715f51]">
            La accion eliminar solo se muestra para barrios sin subzonas activas, igual que en legacy.
          </p>
        </section>
      </section>
    </main>
  );
}
