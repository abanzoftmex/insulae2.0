import Link from "next/link";
import { Playfair_Display, Sora } from "next/font/google";

import { deleteTicketDepartmentAction } from "./actions";

import {
  getTicketDepartmentListingUseCase,
  toTicketDepartmentListingVM,
} from "@/modules/ticket-departments";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-ticket-display",
});

const uiFont = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ticket-ui",
});

function DotGridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="5" cy="5" r="2" fill="currentColor" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="19" cy="5" r="2" fill="currentColor" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="19" cy="12" r="2" fill="currentColor" />
      <circle cx="5" cy="19" r="2" fill="currentColor" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
      <circle cx="19" cy="19" r="2" fill="currentColor" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4.5 7.5 12 13l7.5-5.5" />
    </svg>
  );
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 11 11 4l9 9-7 7-9-9Z" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

export default async function DepartamentosTicketsPage() {
  const submitDeleteDepartment = async (formData: FormData): Promise<void> => {
    "use server";
    await deleteTicketDepartmentAction(formData);
  };

  const listing = await getTicketDepartmentListingUseCase.execute();

  if (!listing) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#f1ece5] px-6 py-12 text-[#1d1611] sm:px-10">
        <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-[#d8cbbb] bg-white/85 p-8 shadow-[0_18px_36px_rgba(21,16,11,0.12)]">
          <h1 className="text-3xl font-semibold text-[#35261d]">Departamentos de tickets</h1>
          <p className="mt-3 text-sm text-[#6d5948]">
            Aun no hay un condominio activo para operar este catalogo. Verifica la configuracion inicial del proyecto.
          </p>
        </section>
      </main>
    );
  }

  const vm = toTicketDepartmentListingVM(listing);

  return (
    <main
      className={`${displayFont.variable} ${uiFont.variable} relative isolate min-h-screen overflow-hidden bg-[#f5efe6] px-5 pb-16 pt-8 text-[#201811] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-7rem] h-[24rem] w-[24rem] rotate-[-22deg] rounded-[2.4rem] bg-[#0c7a6e]/14 blur-3xl" />
        <div className="absolute right-[-9rem] top-[10rem] h-[21rem] w-[24rem] rotate-[16deg] rounded-[2.4rem] bg-[#cf6f2b]/16 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/2 h-[16rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#20150d]/12 blur-3xl" />
        <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(99,72,54,0.16)_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-[2.2rem] border border-[#c5b39f]/55 bg-[linear-gradient(132deg,rgba(255,255,255,0.94)_0%,rgba(250,238,224,0.92)_46%,rgba(238,224,206,0.95)_100%)] p-6 shadow-[0_20px_40px_rgba(27,20,13,0.14)] sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full border border-[#d8c8b8] bg-white/50 [animation:ticketOrbit_7s_ease-in-out_infinite]" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#cbb9a7] bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#775640]">
                <DotGridIcon />
                Mesa de atencion
              </p>
              <h1 className="mt-3 font-[var(--font-ticket-display)] text-4xl leading-none text-[#2e2118] sm:text-5xl">
                {vm.title}
              </h1>
              <p className="mt-3 max-w-3xl font-[var(--font-ticket-ui)] text-sm leading-relaxed text-[#5f5042] sm:text-base">
                {vm.subtitle} Este flujo ya opera sobre Neon con arquitectura hexagonal y sin dependencias runtime de legacy.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-[#ccb9a7] bg-white/82 px-4 py-3 text-right shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e6550]">Total departamentos</p>
                <p className="mt-1 text-2xl font-semibold text-[#2f2218]">{vm.total}</p>
              </div>

              <Link
                href="/departamentos-tickets/nuevo"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#0d5a62] bg-[linear-gradient(150deg,#0D7A86_0%,#0D5962_100%)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_rgba(13,89,98,0.26)] transition hover:brightness-110"
              >
                <ChipIcon />
                Nuevo departamento
              </Link>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[1.9rem] border border-[#cbb8a7]/55 bg-white/84 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm">
          {vm.rows.length === 0 ? (
            <div className="p-8 sm:p-10">
              <div className="rounded-2xl border border-dashed border-[#d5c2b0] bg-[#fff9f1] p-8 text-center">
                <p className="text-lg font-semibold text-[#3f2f24]">No hay departamentos registrados</p>
                <p className="mt-2 text-sm text-[#6d5948]">
                  Crea el primer departamento para canalizar tickets con una operacion profesional.
                </p>
                <Link
                  href="/departamentos-tickets/nuevo"
                  className="mt-4 inline-flex rounded-xl border border-[#0d5e66] bg-[#0d5e66] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
                >
                  Crear primer departamento
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse font-[var(--font-ticket-ui)] text-sm">
                <thead className="bg-[#f5ebdf] text-xs uppercase tracking-[0.12em] text-[#7f5f4a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Departamento</th>
                    <th className="px-4 py-3 text-left font-semibold">Correo</th>
                    <th className="px-4 py-3 text-left font-semibold">Carga</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.rows.map((row, index) => {
                    const workloadClass =
                      row.workloadLevel === "high"
                        ? "border-[#d7a18a] bg-[#fff0e8] text-[#93462c]"
                        : row.workloadLevel === "low"
                          ? "border-[#afcab6] bg-[#edf8ef] text-[#2e6940]"
                          : "border-[#d9c9ba] bg-[#f8efe7] text-[#755f4f]";

                    return (
                      <tr
                        key={row.id}
                        className="border-t border-[#eadbce] bg-white/90 [animation:condoFadeUp_0.5s_ease-out_both]"
                        style={{ animationDelay: `${index * 55}ms` }}
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[#2f231a]">{row.name}</p>
                        </td>

                        <td className="px-4 py-4 text-[#5b4c40]">
                          <a
                            href={`mailto:${row.email}`}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d7c3b1] bg-[#fff8ef] px-2.5 py-1 text-[11px] font-semibold text-[#5a4638] transition hover:bg-[#fff0df]"
                          >
                            <MailIcon />
                            {row.email}
                          </a>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${workloadClass}`}
                          >
                            <DotGridIcon />
                            {row.ticketsCountLabel}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/departamentos-tickets/${row.id}/editar`}
                              className="rounded-lg border border-[#c8ae97] bg-[#fff7ed] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4b39] transition hover:bg-[#ffeedb]"
                            >
                              Editar
                            </Link>

                            {row.canDelete ? (
                              <form action={submitDeleteDepartment}>
                                <input type="hidden" name="departmentId" value={row.id} />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-[#b75b46] bg-[#fff1ed] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a3402e] transition hover:bg-[#ffe6df]"
                                >
                                  Eliminar
                                </button>
                              </form>
                            ) : (
                              <span className="inline-flex items-center rounded-lg border border-[#c6b39f] bg-[#f4ece3] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6d57]">
                                En uso
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
