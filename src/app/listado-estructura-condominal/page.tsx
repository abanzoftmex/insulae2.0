import Link from "next/link";

import { getCondominiumStructureListingUseCase } from "@/modules/condominium-structure";
import { toCondominiumStructureListingVm } from "@/modules/condominium-structure/presentation/condominium-structure-listing.vm";

import { deleteCondominiumStructureGroupFromFormAction } from "./actions";

export default async function ListadoEstructuraCondominalPage() {
  const listing = await getCondominiumStructureListingUseCase.execute();

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#efe7dc] px-6 py-10 text-[#2a1f18]">
        <section className="mx-auto max-w-4xl rounded-3xl border border-[#ccb39a] bg-white/80 p-6 shadow-[0_16px_30px_rgba(42,29,19,0.12)]">
          <h1 className="font-[var(--font-landuse-display)] text-3xl text-[#2e2119]">Estructura condominal</h1>
          <p className="mt-3 text-sm text-[#6b5548]">
            No fue posible cargar el condominio activo. Verifica la configuracion del contexto del proyecto.
          </p>
        </section>
      </main>
    );
  }

  const vm = toCondominiumStructureListingVm(listing);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#efe7dc] px-5 pb-14 pt-8 text-[#231a15] sm:px-8 lg:px-12">
      {/* VISUAL GUIDE: Composicion luminosa para mantener continuidad con modulos recientes sin repetir la misma jerarquia. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-8rem] h-[24rem] w-[27rem] rounded-full bg-[#8d5439]/18 blur-3xl" />
        <div className="absolute right-[-10rem] top-[11rem] h-[21rem] w-[24rem] rounded-full bg-[#436f62]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(255,255,255,0.44),transparent_36%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#c4ab93]/45 bg-[linear-gradient(130deg,rgba(255,250,241,0.96)_0%,rgba(246,236,222,0.93)_56%,rgba(237,223,203,0.9)_100%)] p-6 shadow-[0_22px_45px_rgba(42,28,20,0.14)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#926746]">Gobierno Interno</p>
              <h1 className="mt-2 font-[var(--font-landuse-display)] text-4xl leading-none text-[#2f2219] sm:text-5xl">
                {vm.title}
              </h1>
              <p className="mt-3 max-w-3xl font-[var(--font-landuse-body)] text-sm leading-relaxed text-[#5f5044] sm:text-base">
                {vm.subtitle}
              </p>
            </div>

            <Link
              href="/listado-estructura-condominal/nuevo"
              className="inline-flex rounded-xl border border-[#305374] bg-[linear-gradient(150deg,#3c648e_0%,#2f4d70_100%)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ecf4ff] shadow-[0_12px_22px_rgba(45,72,104,0.3)] transition hover:brightness-110"
            >
              Nuevo grupo
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[#c8b09a]/50 bg-white/70 shadow-[0_18px_36px_rgba(36,23,16,0.1)] backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-[#f2e7d7] text-[11px] uppercase tracking-[0.14em] text-[#81573d]">
                  <th className="border-b border-[#d7c2ad] px-4 py-3">Nombre</th>
                  <th className="border-b border-[#d7c2ad] px-4 py-3">Tipo</th>
                  <th className="border-b border-[#d7c2ad] px-4 py-3">Posicion</th>
                  <th className="border-b border-[#d7c2ad] px-4 py-3">Conceptos</th>
                  <th className="border-b border-[#d7c2ad] px-4 py-3">Cantidad</th>
                  <th className="border-b border-[#d7c2ad] px-4 py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {vm.rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-[#6f5a4d]" colSpan={6}>
                      No hay grupos registrados todavia.
                    </td>
                  </tr>
                ) : (
                  vm.rows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? "bg-white/70" : "bg-[#fff7ed]/65"}>
                      <td className="border-b border-[#e4d3c1] px-4 py-3 font-semibold text-[#2d2119]">{row.name}</td>
                      <td className="border-b border-[#e4d3c1] px-4 py-3 text-[#5c473c]">{row.typeLabel}</td>
                      <td className="border-b border-[#e4d3c1] px-4 py-3 text-[#5c473c]">{row.positionLabel}</td>
                      <td className="border-b border-[#e4d3c1] px-4 py-3 text-[#5c473c]">{row.conceptsLabel}</td>
                      <td className="border-b border-[#e4d3c1] px-4 py-3 text-[#5c473c]">{row.conceptsCountLabel}</td>
                      <td className="border-b border-[#e4d3c1] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/listado-estructura-condominal/${row.id}/editar`}
                            className="rounded-md border border-[#c9b39d] bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6f4c39]"
                          >
                            Editar
                          </Link>

                          {row.canDelete ? (
                            <form action={deleteCondominiumStructureGroupFromFormAction}>
                              <input type="hidden" name="groupId" value={row.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-[#d0a791] bg-[#fff1ea] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#934627]"
                              >
                                Eliminar
                              </button>
                            </form>
                          ) : (
                            <span className="rounded-md border border-[#d8c4b3] bg-[#f5ece2] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a6a55]">
                              Bloqueado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
