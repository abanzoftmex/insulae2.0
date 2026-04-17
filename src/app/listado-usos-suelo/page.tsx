import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";

import { getLandUseListingUseCase } from "@/modules/land-uses";
import { toLandUseListingVM } from "@/modules/land-uses/presentation/land-use-listing.vm";

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-landuse-display",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landuse-body",
});

export const metadata: Metadata = {
  title: "Usos de suelo | Insulae 2.0",
  description: "Listado de usos de suelo con datos operativos desde Neon.",
};

export const dynamic = "force-dynamic";

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 fill-current">
      <path d="M9.25 3.25a.75.75 0 0 1 1.5 0v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6z" />
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

export default async function ListadoUsosSueloPage() {
  const listing = await getLandUseListingUseCase.execute();
  const vm = listing ? toLandUseListingVM(listing) : null;

  if (!vm) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-6 py-20">
        <section className="rounded-3xl border border-[#cdb39a]/50 bg-[#fff8ef] p-8 text-center shadow-[0_16px_34px_rgba(43,28,20,0.12)]">
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f6247]">Usos de suelo</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2d2018]">Sin datos disponibles</h1>
          <p className="mt-3 text-sm text-[#604f42]">
            No se encontro un condominio activo para consultar usos de suelo.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`${display.variable} ${body.variable} relative isolate min-h-screen overflow-hidden bg-[#ebe5d7] px-5 pb-14 pt-8 text-[#1f1713] sm:px-8 lg:px-12`}
    >
      {/* VISUAL GUIDE: Cambia estos blobs y gradientes para definir una atmosfera distinta sin tocar la estructura funcional. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-7rem] h-[22rem] w-[24rem] rounded-full bg-[#9a5f3d]/15 blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[20rem] w-[24rem] rounded-full bg-[#3f6f62]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.5),transparent_36%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        {/* VISUAL GUIDE: Este header es el bloque hero; aqui se puede rediseñar tipografia, contraste y badges. */}
        <header className="rounded-[2rem] border border-[#bea486]/45 bg-[linear-gradient(130deg,rgba(255,248,236,0.95)_0%,rgba(249,238,223,0.93)_62%,rgba(237,223,204,0.9)_100%)] p-6 shadow-[0_22px_50px_rgba(43,27,17,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-[#7b4f38]/35 bg-[#7b4f38]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#73452e]">
              Catalogos operativos
            </span>

            <Link
              href="/listado-usos-suelo/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#447f4a] bg-[linear-gradient(160deg,#5cae5f_0%,#447f4a_100%)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_20px_rgba(66,120,66,0.26)] transition hover:brightness-110"
              title="Crear uso de suelo"
            >
              <PlusIcon />
              Nuevo uso de suelo
            </Link>
          </div>

          <h1 className="mt-4 font-[var(--font-landuse-display)] text-4xl leading-none text-[#2c2019] sm:text-5xl">
            Usos de suelo
          </h1>

          <p className="mt-3 max-w-5xl font-[var(--font-landuse-body)] text-sm leading-relaxed text-[#5a4b40] sm:text-base">
            Listado operativo para <strong>{vm.condominiumName}</strong>. Los montos por columna se calculan desde
            cargos activos por area, manteniendo toda la lectura sobre Neon.
          </p>

          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#7f5d48]">
            {vm.totalRows} usos activos {vm.usesLandUseFormula ? "- Formula de uso de suelo activa" : "- Formula de uso de suelo inactiva"}
          </p>
        </header>

        <section className="rounded-3xl border border-[#bea993]/45 bg-white/68 p-5 shadow-[0_16px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfb8a2]/70 pb-3">
            <h2 className="font-[var(--font-landuse-display)] text-2xl leading-none text-[#2b1f18] sm:text-3xl">
              Listado de usos de suelo
            </h2>
            <p className="text-xs uppercase tracking-[0.14em] text-[#7e5741]">Vista equivalente modernizada</p>
          </div>

          {/* VISUAL GUIDE: Aqui viven los estilos de tabla (thead, bordes, sticky, zebra). Si quieres otra estética, cambia solo clases de este bloque. */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#d2c0ad] bg-[#fff8ee]">
            <div className="overflow-x-auto">
              <table className="min-w-[1600px] w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 w-[88px] min-w-[88px] border-b border-[#d8c6b2] bg-[#d7dde8] px-3 py-3 text-left font-semibold text-[#2e241e]">
                      Orden
                    </th>
                    <th className="min-w-[280px] border-b border-l border-[#d8c6b2] bg-[#d7dde8] px-3 py-3 text-left font-semibold text-[#2e241e]">
                      Nombre
                    </th>
                    <th className="border-b border-l border-[#d8c6b2] bg-[#d7dde8] px-3 py-3 text-left font-semibold text-[#2e241e]">
                      Iniciales
                    </th>
                    <th className="border-b border-l border-[#d8c6b2] bg-[#d7dde8] px-3 py-3 text-left font-semibold text-[#2e241e]">
                      Total
                    </th>
                    <th className="border-b border-l border-[#d8c6b2] bg-[#d7dde8] px-3 py-3 text-left font-semibold text-[#2e241e]">
                      M2
                    </th>
                    {vm.columns.map((column) => (
                      <th
                        key={column.key}
                        className="border-b border-l border-[#d8c6b2] bg-[#cfd9e8] px-3 py-3 text-center font-semibold text-[#2e241e]"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="border-b border-l border-[#d8c6b2] bg-[#c8d4e8] px-3 py-3 text-center font-semibold text-[#2e241e]">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {vm.rows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-[#fff2de]/65">
                      <td className="sticky left-0 z-10 w-[88px] min-w-[88px] border-b border-[#d8c6b2] bg-[#f8f1e6] px-3 py-3 font-semibold text-[#2f241d]">
                        {row.order}
                      </td>
                      <td className="min-w-[280px] border-b border-l border-[#d8c6b2] bg-[#f8f1e6] px-3 py-3 font-semibold text-[#2f241d]">
                        {row.name}
                      </td>
                      <td className="border-b border-l border-[#d8c6b2] px-3 py-3 text-[#3d3028]">
                        <span className="inline-flex rounded-md border border-[#cfb79f] bg-[#f4e8da] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-[#6b4e3b]">
                          {row.initials}
                        </span>
                      </td>
                      <td className="border-b border-l border-[#d8c6b2] px-3 py-3 text-[#3d3028]">{row.totalAreas}</td>
                      <td className="border-b border-l border-[#d8c6b2] px-3 py-3 text-[#3d3028]">{row.totalM2}</td>

                      {vm.columns.map((column) => {
                        const cell = row.charges[column.key];
                        return (
                          <td
                            key={`${row.id}-${column.key}`}
                            className="border-b border-l border-[#d8c6b2] px-3 py-3 text-[#3d3028]"
                          >
                            <p className="font-semibold text-[#2f241d]">{cell?.amount ?? "$0.00"}</p>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[#876350]">
                              {cell?.applicationModeLabel ?? "Pago unico"}
                            </p>
                          </td>
                        );
                      })}

                      {/* VISUAL GUIDE: Botonera de acciones; aqui puedes aplicar nuevo lenguaje de iconos/colores sin tocar links. */}
                      <td className="border-b border-l border-[#d8c6b2] px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/listado-usos-suelo/${row.id}/editar`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#b68f42] bg-[linear-gradient(160deg,#caa64d_0%,#ab7f2f_100%)] text-white shadow-[0_8px_14px_rgba(122,90,32,0.25)] transition hover:scale-[1.03]"
                            title="Editar uso de suelo"
                            aria-label={`Editar ${row.name}`}
                          >
                            <PencilIcon />
                          </Link>

                          {row.canDelete ? (
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c06143] bg-[linear-gradient(160deg,#db7b57_0%,#b24a31_100%)] text-white shadow-[0_8px_14px_rgba(133,58,39,0.24)] transition hover:scale-[1.03]"
                              title="Eliminacion en siguiente iteracion"
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
          </div>

          <p className="mt-4 text-xs text-[#715f51]">
            Solo se consideran areas activas que hoy operan en el condominio (disponibles y rentadas).
          </p>
        </section>
      </section>
    </main>
  );
}
