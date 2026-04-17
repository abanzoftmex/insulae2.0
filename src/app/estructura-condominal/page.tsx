import Link from "next/link";

import { getCondominiumOrganigramUseCase } from "@/modules/condominium-organigram";

import { OrganigramaEditorShell } from "./organigrama-editor-shell";

type PageSearchParams = Promise<{
  mode?: string;
}>;

interface EstructuraCondominalPageProps {
  searchParams: PageSearchParams;
}

export default async function EstructuraCondominalPage({ searchParams }: EstructuraCondominalPageProps) {
  const params = await searchParams;
  const isEditMode = params.mode === "edit";

  const snapshot = await getCondominiumOrganigramUseCase.execute();

  if (!snapshot) {
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

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#efe7dc] px-5 pb-14 pt-8 text-[#231a15] sm:px-8 lg:px-12">
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
                Estructura condominal
              </h1>
              <p className="mt-3 max-w-3xl font-[var(--font-landuse-body)] text-sm leading-relaxed text-[#5f5044] sm:text-base">
                Organigrama operativo de {snapshot.condominiumName}. Administra responsables y suplentes por cargo sin
                depender de datos legacy en tiempo de ejecucion.
              </p>
            </div>

            {isEditMode ? (
              <Link
                href="/estructura-condominal"
                className="inline-flex rounded-xl border border-[#c9b39d] bg-white/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#6f4c39]"
              >
                Ver modo consulta
              </Link>
            ) : (
              <Link
                href="/estructura-condominal?mode=edit"
                className="inline-flex rounded-xl border border-[#305374] bg-[linear-gradient(150deg,#3c648e_0%,#2f4d70_100%)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ecf4ff] shadow-[0_12px_22px_rgba(45,72,104,0.3)] transition hover:brightness-110"
              >
                Editar estructura condominal
              </Link>
            )}
          </div>
        </header>

        {isEditMode ? (
          <OrganigramaEditorShell groups={snapshot.groups} userOptions={snapshot.userOptions} />
        ) : (
          <section className="space-y-5">
            {snapshot.groups.length === 0 ? (
              <article className="rounded-2xl border border-[#c8b09a]/55 bg-white/80 px-4 py-6 text-sm text-[#6a5345]">
                No hay grupos o cargos activos para mostrar en el organigrama.
              </article>
            ) : (
              snapshot.groups.map((group) => (
                <article
                  key={group.groupId}
                  className="overflow-hidden rounded-2xl border border-[#c8b09a]/55 bg-white/80 shadow-[0_14px_28px_rgba(36,23,16,0.08)]"
                >
                  <header className="border-b border-[#dccab7] bg-[#fbf2e6] px-4 py-3">
                    <h2 className="font-[var(--font-landuse-display)] text-2xl text-[#2f2219]">{group.groupName}</h2>
                  </header>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                      <thead>
                        <tr className="bg-[#f2e7d7] text-[11px] uppercase tracking-[0.14em] text-[#82563d]">
                          <th className="border-b border-[#dcc7b2] px-4 py-3">Cargo</th>
                          <th className="border-b border-[#dcc7b2] px-4 py-3">Responsable</th>
                          <th className="border-b border-[#dcc7b2] px-4 py-3">Suplente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, index) => (
                          <tr key={row.positionId} className={index % 2 === 0 ? "bg-white/70" : "bg-[#fff7ed]/65"}>
                            <td className="border-b border-[#e4d3c1] px-4 py-3 align-top font-semibold text-[#2f241d]">
                              {row.positionName}
                            </td>
                            <td className="border-b border-[#e4d3c1] px-4 py-3 align-top text-[#5d473c]">
                              {row.responsible.length === 0 ? (
                                <span className="text-[#8f7868]">Sin responsable</span>
                              ) : (
                                <div className="space-y-1">
                                  {row.responsible.map((item) => (
                                    <p key={`${row.positionId}-${item.userId}`}>{item.displayName}</p>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="border-b border-[#e4d3c1] px-4 py-3 align-top text-[#5d473c]">
                              {row.allowsAlternate ? (
                                row.alternates.length === 0 ? (
                                  <span className="text-[#8f7868]">Sin suplente</span>
                                ) : (
                                  <div className="space-y-1">
                                    {row.alternates.map((item) => (
                                      <p key={`${row.positionId}-${item.userId}`}>{item.displayName}</p>
                                    ))}
                                  </div>
                                )
                              ) : (
                                <span className="text-[#8f7868]">No aplica</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </section>
    </main>
  );
}
