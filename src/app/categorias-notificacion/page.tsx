import Link from "next/link";

import { deleteNotificationCategoryAction } from "./actions";

import {
  getNotificationCategoryListingUseCase,
  toNotificationCategoryListingVM,
} from "@/modules/notification-categories";

export default async function CategoriasNotificacionPage() {
  const submitDeleteCategory = async (formData: FormData): Promise<void> => {
    "use server";
    await deleteNotificationCategoryAction(formData);
  };

  const listing = await getNotificationCategoryListingUseCase.execute();

  if (!listing) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#f4efe8] px-6 py-10 text-[#221913] sm:px-10">
        <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-[#d5c3b2] bg-white/85 p-8 shadow-[0_18px_36px_rgba(33,20,14,0.12)]">
          <h1 className="text-3xl font-semibold text-[#35261d]">Categorias de notificacion</h1>
          <p className="mt-3 text-sm text-[#6d5948]">
            Aun no hay un condominio activo para operar este catalogo. Verifica la configuracion inicial del proyecto.
          </p>
        </section>
      </main>
    );
  }

  const vm = toNotificationCategoryListingVM(listing);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f4efe8] px-5 pb-16 pt-8 text-[#1f1714] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-7rem] h-[24rem] w-[22rem] rotate-[-18deg] rounded-[3rem] bg-[#0c7c86]/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-[10rem] h-[23rem] w-[26rem] rotate-[14deg] rounded-[3rem] bg-[#d17a22]/14 blur-3xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(128,92,69,0.12)_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2.2rem] border border-[#c8b7a9]/55 bg-[linear-gradient(120deg,rgba(255,255,255,0.96)_0%,rgba(248,237,224,0.93)_52%,rgba(238,223,199,0.92)_100%)] p-6 shadow-[0_22px_44px_rgba(35,23,16,0.12)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c5944]">Catalogo operativo</p>
              <h1 className="mt-2 text-4xl font-semibold leading-none text-[#2f2219] sm:text-5xl">{vm.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5f5044] sm:text-base">{vm.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-[#ccb8a5] bg-white/85 px-4 py-3 text-right shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e6550]">Total categorias</p>
                <p className="mt-1 text-2xl font-semibold text-[#2f2218]">{vm.total}</p>
              </div>

              <Link
                href="/categorias-notificacion/nuevo"
                className="inline-flex items-center rounded-2xl border border-[#0d5e66] bg-[linear-gradient(150deg,#0C7C86_0%,#0C5A62_100%)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_rgba(12,90,98,0.25)] transition hover:brightness-110"
              >
                Nueva categoria
              </Link>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[1.9rem] border border-[#cbb8a7]/55 bg-white/82 shadow-[0_18px_34px_rgba(35,23,16,0.1)] backdrop-blur-sm">
          {vm.rows.length === 0 ? (
            <div className="p-8 sm:p-10">
              <div className="rounded-2xl border border-dashed border-[#d5c2b0] bg-[#fff9f1] p-8 text-center">
                <p className="text-lg font-semibold text-[#3f2f24]">No hay categorias registradas</p>
                <p className="mt-2 text-sm text-[#6d5948]">
                  Comienza creando una categoria para clasificar notificaciones del condominio.
                </p>
                <Link
                  href="/categorias-notificacion/nuevo"
                  className="mt-4 inline-flex rounded-xl border border-[#0d5e66] bg-[#0d5e66] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
                >
                  Crear primera categoria
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#f5ebdf] text-xs uppercase tracking-[0.12em] text-[#7f5f4a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Categoria</th>
                    <th className="px-4 py-3 text-left font-semibold">Color</th>
                    <th className="px-4 py-3 text-left font-semibold">Uso</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#eadbce] bg-white/90">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#2f231a]">{row.name}</p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-[#d8c3b0] bg-[#fff9f3] px-2.5 py-1.5 text-xs font-semibold tracking-[0.06em] text-[#684f3f]">
                          <span
                            className="h-4 w-4 rounded-sm border border-black/15"
                            style={{ backgroundColor: row.color }}
                            aria-hidden
                          />
                          {row.color}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[#5b4c40]">{row.notificationsCountLabel}</td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/categorias-notificacion/${row.id}/editar`}
                            className="rounded-lg border border-[#c8ae97] bg-[#fff7ed] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4b39] transition hover:bg-[#ffeedb]"
                          >
                            Editar
                          </Link>

                          {row.canDelete ? (
                            <form action={submitDeleteCategory}>
                              <input type="hidden" name="categoryId" value={row.id} />
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
