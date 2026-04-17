import Link from "next/link";

import { getTicketListingUseCase, toTicketListingVM } from "@/modules/tickets";

export default async function TicketsPage() {
  const listing = await getTicketListingUseCase.execute();

  if (!listing) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#f4efe8] px-6 py-10 text-[#221913] sm:px-10">
        <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-[#d5c3b2] bg-white/85 p-8 shadow-[0_18px_36px_rgba(33,20,14,0.12)]">
          <h1 className="text-3xl font-semibold text-[#35261d]">Tickets</h1>
          <p className="mt-3 text-sm text-[#6d5948]">
            Aun no hay un condominio activo para operar tickets. Verifica la configuracion inicial del proyecto.
          </p>
        </section>
      </main>
    );
  }

  const vm = toTicketListingVM(listing);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f4efe8] px-5 pb-16 pt-8 text-[#1f1714] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-7rem] h-[24rem] w-[22rem] rotate-[-18deg] rounded-[3rem] bg-[#0c7c86]/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-[10rem] h-[23rem] w-[26rem] rotate-[14deg] rounded-[3rem] bg-[#d17a22]/14 blur-3xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(128,92,69,0.12)_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2.2rem] border border-[#c8b7a9]/55 bg-[linear-gradient(120deg,rgba(255,255,255,0.96)_0%,rgba(248,237,224,0.93)_52%,rgba(238,223,199,0.92)_100%)] p-6 shadow-[0_22px_44px_rgba(35,23,16,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c5944]">Mesa de soporte</p>
              <h1 className="mt-2 text-4xl font-semibold leading-none text-[#2f2219] sm:text-5xl">{vm.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5f5044] sm:text-base">{vm.subtitle}</p>
            </div>

            <div className="rounded-2xl border border-[#ccb8a5] bg-white/85 px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e6550]">Total tickets</p>
              <p className="mt-1 text-2xl font-semibold text-[#2f2218]">{vm.total}</p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[1.9rem] border border-[#cbb8a7]/55 bg-white/82 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm">
          {vm.rows.length === 0 ? (
            <div className="p-8 sm:p-10">
              <div className="rounded-2xl border border-dashed border-[#d5c2b0] bg-[#fff9f1] p-8 text-center">
                <p className="text-lg font-semibold text-[#3f2f24]">No hay tickets registrados</p>
                <p className="mt-2 text-sm text-[#6d5948]">En cuanto exista actividad de soporte, aparecera en este listado.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#f5ebdf] text-xs uppercase tracking-[0.12em] text-[#7f5f4a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">No. ticket</th>
                    <th className="px-4 py-3 text-left font-semibold">Departamento</th>
                    <th className="px-4 py-3 text-left font-semibold">Condomino</th>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left font-semibold">Descripcion</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#eadbce] bg-white/90">
                      <td className="px-4 py-4 font-semibold text-[#2f231a]">{row.ticketNumber}</td>
                      <td className="px-4 py-4 text-[#5b4c40]">{row.departmentName}</td>
                      <td className="px-4 py-4 text-[#5b4c40]">{row.residentName}</td>
                      <td className="px-4 py-4 text-[#5b4c40]">{row.openedAtLabel}</td>
                      <td className="px-4 py-4 text-[#2f231a]">{row.title}</td>
                      <td className="px-4 py-4 text-[#5b4c40]">{row.descriptionPreview}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            row.statusTone === "closed"
                              ? "border-[#d6b3a4] bg-[#fff0ea] text-[#8d4b35]"
                              : "border-[#abc4af] bg-[#edf8ef] text-[#2f6a40]"
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/tickets/${row.id}/editar`}
                          className="inline-flex rounded-lg border border-[#c8ae97] bg-[#fff7ed] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4b39] transition hover:bg-[#ffeedb]"
                        >
                          Responder
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
